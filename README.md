# Lively Reload
## Features
* **Live preview of your `.html`, `.css` files without the need to save.**

https://user-images.githubusercontent.com/27907396/121034411-34a42200-c7d7-11eb-8138-d02370d2e0c4.mp4
* **The preview will reload when you save `.js` files.**

https://user-images.githubusercontent.com/27907396/121034475-3ec62080-c7d7-11eb-8b1b-0b1a41cc8ce1.mp4
* **`.pug`, `.scss`, `.sass`, `.ts` files are also support.**

https://user-images.githubusercontent.com/27907396/121034591-530a1d80-c7d7-11eb-8974-ece8cdc8f800.mp4
* **2 container tags for wrapping editable contents are provided.**
  ```html
  <!-- <lively-container> -->
  editable contents
  <!-- </lively-container> -->
  ```
  The tags can be attained by typing `<lively-container>` then pressing `Ctrl`+`/` to turn it into a comment. (so as not to affect your code flow)

  They are useful when working with libraries which inject its own code into the DOM like *Aframe*. In other cases, however, directly commenting out code is more advisable.

  If either tag is omitted, the editable contents will start/end at the first/last element of the same indentation level.
## Notes
* Use double-quote `"` for `html` tags' attributes.
* Previous active files are still displaying in the background. Therefore if you suffer from a decrease in performance, call for a hard reload through `Ctrl`+`Shift`+`P` → `>livelyReload.reloadLively`.
* Only the first workspace is support in a multi-workspace environment, since identification of the active workspace is not an option.
* Moving container tags (`Alt`+`Up/Down` by default) will cause error. Instead, remove the tag first, or better, call a hard reload.
## Settings
* **`livelyReload.port`**: A port to listen to the server.
  * Default value is `2020`.
* **`livelyReload.pugOptions`**: Configurations for exported pug files.
  * Options:
  ```
  {
    "outdir": "dist",
    "maxLoop": 99,
    "pretty": true
  }
  ```
  * Set `outdir` to `null` to disable exporting .pug files on save.
  * When set to `null`, the `.pug` content will still be servable to the live preview.
  * If the file existed in the target directory, it will be overwrited.
  * `maxLoop` is the safelock constraint in case you trigger infinite loop such as writing `while n`. Change the value if you will use a loop with more iterations.
* **`livelyReload.sassOptions`**: Configurations for exported sass files.
  * Options:
  ```
  {
    "outdir": "dist",
    "pretty": true
  }
  ```
  * Set `outdir` to null to disable exporting `.scss`/`.sass` files on save.
  * When set to `null`, the `.scss`/`.sass` content will still be servable to the live preview.
* **`livelyReload.typescriptOptions`**: Configurations for exported typescript files.
  * Options:
  ```
  {
    "outdir": "dist"
  }
  ```
  * Set `outdir` to `null` to disable exporting `.ts` files on save.
  * When set to `null`, the `.js` files won't be updated, but the preview will still automatically reload.
  * Typescript does not support generation of minifies or obfuscated code.
## Release Notes
### 1.0.0
Initial release.
## License
Lively Reload is [MIT Licensed](../blob/master/LICENSE).
