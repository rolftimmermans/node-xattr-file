/* Copyright (c) 2014 Rolf Timmermans */

/* Documentation of the AppleDouble format with resource forks can be found in:
   http://www.opensource.apple.com/source/xnu/xnu-792.13.8/bsd/vfs/vfs_xattr.c

   The following is an excerpt, and gives an idea of the format:

   Typical "._" AppleDouble Header File layout:
  ------------------------------------------------------------
         MAGIC          0x00051607
         VERSION        0x00020000
         FILLER         0
         COUNT          2
     .-- AD ENTRY[0]    Finder Info Entry (must be first)
  .--+-- AD ENTRY[1]    Resource Fork Entry (must be last)
  |  '-> FINDER INFO
  |      /////////////  Fixed Size Data (32 bytes)
  |      EXT ATTR HDR
  |      /////////////
  |      ATTR ENTRY[0] --.
  |      ATTR ENTRY[1] --+--.
  |      ATTR ENTRY[2] --+--+--.
  |         ...          |  |  |
  |      ATTR ENTRY[N] --+--+--+--.
  |      ATTR DATA 0   <-'  |  |  |
  |      ////////////       |  |  |
  |      ATTR DATA 1   <----'  |  |
  |      /////////////         |  |
  |      ATTR DATA 2   <-------'  |
  |      /////////////            |
  |         ...                   |
  |      ATTR DATA N   <----------'
  |      /////////////
  |                      Attribute Free Space
  |
  '----> RESOURCE FORK
         /////////////   Variable Sized Data
         /////////////
         /////////////
         /////////////
         /////////////
         /////////////
            ...
         /////////////

  ------------------------------------------------------------

   NOTE: The EXT ATTR HDR, ATTR ENTRY's and ATTR DATA's are
   stored as part of the Finder Info.  The length in the Finder
   Info AppleDouble entry includes the length of the extended
   attribute header, attribute entries, and attribute data.
*/


var bufferpack = require("bufferpack")

var applFormat = "24sH LLL LLL"
var applMagic = "\x00\x05\x16\x07\x00\x02\x00\x00Mac OS X        "
var applEntries = 2

var finderInfoType = 9
var resourceForkType = 2

var attrFormat = "32x xx 4s 4x LLL 12x 2x"
var attrMagic = "\x41\x54\x54\x52"

var dataFormat = "LL HB S"

/* Creates a buffer containing all xattr keys for use at given file offset. */
function createAttrKeys(keys, values, offset) {
  /* Start with number of entries. */
  var format = "H "
  var data = [keys.length]
  offset += 2

  /* Create binary format string for all keys. */
  for (var i = 0, n = keys.length; i < n; i++) {
    var key = keys[i]
    var length = bufferpack.calcLength(dataFormat, [0, 0, 0, 0, key])
    var padding = 4 - length % 4
    format += dataFormat + padding + "x"
    offset += length + padding
  }

  /* Calculate key header data with correct value offsets. */
  for (var i = 0, n = keys.length; i < n; i++) {
    var key = keys[i]
    var value = values[i]

    var keyLength = key.length + 1 /* With trailing \x00 */
    var valueLength = value.length
    var flags = 0

    data = data.concat([
      offset,
      valueLength,
      flags,
      keyLength,
      key,
    ])

    offset += valueLength
  }

  return bufferpack.pack(format, data)
}

/* Creates a buffer containing all xattr data. */
function createAttrData(values) {
  var bufs = []

  for (var i = 0, n = values.length; i < n; i++) {
    bufs.push(new Buffer(values[i]))
  }

  return Buffer.concat(bufs)
}

/* Creates a new xattr file in AppleDouble format, containing the given xattrs. */
function create(attrs) {
  if (!attrs) attrs = {}

  /* Sort keys and values by key name - this is also done by OS X. */
  var keys = Object.keys(attrs).sort()
  var values = []
  for (var i = 0, n = keys.length; i < n; i++) {
    values.push(attrs[keys[i]])
  }

  var applLength = bufferpack.calcLength(applFormat)
  var attrLength = bufferpack.calcLength(attrFormat)

  var keysBuffer = createAttrKeys(keys, values, applLength + attrLength)
  var keysLength = keysBuffer.length

  var dataBuffer = createAttrData(values)
  var dataLength = dataBuffer.length

  var dataOffset = applLength + attrLength + keysLength
  var fileLength = applLength + attrLength + keysLength + dataLength

  var finderInfoOffset = applLength
  var finderInfoLength = attrLength + keysLength + dataLength
  var resourceForkOffset = fileLength
  var resourceForkLength = 0

  var applBuffer = bufferpack.pack(applFormat, [
    applMagic,
    applEntries,
    finderInfoType,
    finderInfoOffset,
    finderInfoLength,
    resourceForkType,
    resourceForkOffset,
    resourceForkLength,
  ])

  var attrBuffer = bufferpack.pack(attrFormat, [
    attrMagic,
    fileLength,
    dataOffset,
    dataLength,
  ])

  return Buffer.concat([
    applBuffer,
    attrBuffer,
    keysBuffer,
    dataBuffer,
  ])
}

module.exports = {
  create: create
}
