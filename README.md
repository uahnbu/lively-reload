<img align="left" src="resources/icon.png" alt="App Icon" height="64">

# Lively Reload
[![Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/uahnbu.lively-reload)](https://marketplace.visualstudio.com/items?itemName=uahnbu.lively-reload)
[![Total Installs](https://img.shields.io/visual-studio-marketplace/i/uahnbu.lively-reload)](https://marketplace.visualstudio.com/items?itemName=uahnbu.lively-reload)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/uahnbu.lively-reload)](https://marketplace.visualstudio.com/items?itemName=uahnbu.lively-reload)
[![Issues](https://img.shields.io/github/issues/uahnbu/lively-reload)](https://github.com/uahnbu/lively-reload/issues)
[![Buy me a coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-bd5fff?logo=buymeacoffee)](https://www.buymeacoffee.com/uahnbu)

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
* To sync the preview across multiple devices, install *Ngrok* manually and create a tunnel to your localhost server.  
  e.g. *terminal*:
  ```
  npm i -g ngrok
  ngrok http 2020 --region ap
  ```
* Reload the whole webpage through `Ctrl`+`Shift`+`P` → `> Reload Lively`.
* Press *Lively Reload* on the statusbar again or run command `> Quit Lively` to turn off the extension.
* Bind the above-mentioned commands to some key combinations for your convenience.
## Notes
* Adding or removing elements at the same level as `script` tags will sometimes cause these `script` tags to reload.
* Unlike the above command, the reload triggered when saving files will only affect the active file, and previous active files displaying in the background won't be affected.
* Only the first workspace is support in a multi-workspace environment, since identification of the active workspace is not an option.
* *Ngrok* is not built into this extension as it's not compatible with *Webpack*.
## Settings
Settings can also be specified in your `package.json` at root directory, by declaring under the property `"livelyReload"`. These settings will override *VSCode Extension Settings*. Changes will take effect immediately when saved.  
e.g. *package.json*: 
```javascript
{
  "name": "example-project",
  "version": "1.0.0",
  "description": "An example project using package.json to config Lively Reload",
  // Other package.json properties
  "livelyReload": {
    "port": 2021,
    "sassCompile": {
      "outdir": "dist/styles"
    },
    "typescriptCompile": {
      "outdir": "dist/scripts",
      "tsconfig": {
        "target": "ES2015",
        "downlevelIteration": true
      }
    }
  }
}
```
## Changelog
View the changelog [here](./CHANGELOG.md).
## License
Lively Reload is [MIT Licensed](./LICENSE).