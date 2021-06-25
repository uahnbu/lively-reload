<img align="left" src="resources/icon.png" alt="App Icon" height="64">

# Lively Reload
[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/uahnbu.lively-reload)](https://marketplace.visualstudio.com/items?itemName=uahnbu.lively-reload)
[![Total Installs](https://img.shields.io/visual-studio-marketplace/i/uahnbu.lively-reload)](https://marketplace.visualstudio.com/items?itemName=uahnbu.lively-reload)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/uahnbu.lively-reload)](https://marketplace.visualstudio.com/items?itemName=uahnbu.lively-reload)
[![Issues](https://img.shields.io/github/issues/uahnbu/lively-reload)](https://github.com/uahnbu/lively-reload/issues)
<a href="https://www.buymeacoffee.com/uahnbu" target="_blank"><img src="https://www.buymeacoffee.com/assets/img/custom_images/purple_img.png" alt="Buy Me A Coffee" height="24"></a>

## Features
* **Live preview of your `.html`, `.css` files without the need to save.**

  ![HTML and CSS Demonstration](./resources/HtmlCss.gif)
* **The preview will reload when you save `.js` files.**

  ![JS Demonstration](./resources/Js.gif)
* **`.pug`, `.scss`, `.sass`, `.ts` files are also support.**

  ![Pug and Sass Demonstration](./resources/PugSass.gif)
## Usage
* By pressing *Lively Reload* on the statusbar, or using the command `> Go Lively`, the extension will start compiling `.pug`, `.scss`, `.sass`, `.ts` files as configured. The statusbar will then turn *blue*.
* By going to the configured port on `localhost` (`127.0.0.1`), the extension will start listening to changes on all supported files. The statusbar will turn *green*.
* To sync the preview across multiple devices, install *ngrok* manually and create a tunnel to your localhost server.  
  e.g.
  ```
  npm i -g ngrok
  ngrok http 2020 --region ap
  ```
* Reload the whole webpage through `Ctrl`+`Shift`+`P` → `> Reload Lively`.
* Press *Lively Reload* on the statusbar again to turn off the extension.
## Notes
* Use double-quote `"` for `html` tags' attributes.
* Unlike the above command, the reload triggered when saving files will only affect the active file, and previous active files displaying in the background won't be affected.
* Only the first workspace is support in a multi-workspace environment, since identification of the active workspace is not an option.
* *ngrok* is not built into this extension as it's not compatible with Webpack.
## Settings
Settings can also be specified in your `package.json` at root directory, by declaring under the property `"livelyReload"`. These settings will override *VSCode Extension Settings*.
* **`livelyReload.port`**: A port to host the server.
  * Default value is `2020`.
  * Changes will take effect after turning *Lively Reload* off and on again.
* **`livelyReload.openBrowser`**: Whether to open the browser when *Lively Reload* starts.
  * Either `true` or `false`. Default to `true`.
  * Changes will take effect immediately.
* **`livelyReload.debug`**: Whether to show logs in the browser's console.
  * Either `true` or `false`. Default to `false`.
  * Changes will take effect immediately.
* **`livelyReload.pugOptions`**: Configurations for exported pug files.
  * Options:
  ```json
  {
    "outdir": "dist",
    "maxLoop": 999,
    "pretty": true
  }
  ```
  * Set `outdir` to `null` to disable exporting .pug files on save.
  * When set to `null`, the `.pug` content will still be servable to the live preview.
  * If the file existed in the target directory, it will be overwrited.
  * `maxLoop` is the safelock constraint in case you trigger infinite loop such as writing `while n`. Change the value if you will use a loop with more iterations.
  * Changes will take effect immediately.
* **`livelyReload.sassOptions`**: Configurations for exported sass files.
  * Options:
  ```json
  {
    "outdir": "dist",
    "pretty": true
  }
  ```
  * Set `outdir` to null to disable exporting `.scss`/`.sass` files on save.
  * When set to `null`, the `.scss`/`.sass` content will still be servable to the live preview.
  * Changes will take effect immediately.
* **`livelyReload.typescriptOptions`**: Configurations for exported typescript files.
  * Options:
  ```json
  {
    "outdir": "dist"
  }
  ```
  * Set `outdir` to `null` to disable exporting `.ts` files on save.
  * When set to `null`, the `.js` files won't be updated, and the preview won't automatically reload.
  * Typescript does not support generation of minifies or obfuscated code.
  * Changes will take effect immediately.
## Changelog
View the changelog [here](./CHANGELOG.md).
## License
Lively Reload is [MIT Licensed](../blob/master/LICENSE).