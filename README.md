xattr-file
==========

Create files that store OS X extended attributes (xattrs) in seperate files.
These files are used on file systems other than HFS+ and in ZIP files. In ZIP
files they are named `__MACOSX/._<file name>`.

The format of xattr files is the legacy AppleDouble format, that contains a
"Finder Info" resource fork, which in turn contains extended attributes. OS X
ignores all other information in the AppleDouble file.

Installing
----------

    npm install xattr-file


Using
-----

    var xattr = require("xattr-file");
    var buffer = xattr.create({
      "com.example.Attribute": "my data"
    });

    /* Use buffer in zip file, or write to __MACOSX/._file. */
