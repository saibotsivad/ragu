# Noddity Example

This folder is the Noddity base site, from [TehShrike/noddity](https://github.com/TehShrike/noddity), with the following edits:

* This readme file (of course).
* The [config.js](./config.js) file was changed to export the config as the default, and `noddityRoot` was changed to `content/`.
* The [ragu.config.js](./ragu.config.js) file was added.
* The `package.json` file was deleted, for clarity.
* The `js` folder was deleted (it was Noddity-overall stuff).

Try building this folder using e.g. `ragu example build -c example/ragu.config.js`
