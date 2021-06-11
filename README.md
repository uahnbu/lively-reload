# Lively Reload
## Features
* **Live preview of your `.html`, `.css` files without the need to save.**
  ![HTML and CSS Demonstration](./resources/HtmlCss.gif)
* **The preview will reload when you save `.js` files.**
  ![JS Demonstration](./resources/Js.gif)
* **`.pug`, `.scss`, `.sass`, `.ts` files are also support.**
  ![Pug and Sass Demonstration](./resources/PugSass.gif)
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
## Changelog
### [Unreleased]
* Add padding/margin highlight for elements selected in editor.
### [0.0.1]
Initial release.
## License
Lively Reload is [MIT Licensed](../blob/master/LICENSE).
