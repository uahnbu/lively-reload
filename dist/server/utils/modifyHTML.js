"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
function modifyHTML(html) {
    return injectCSS(injectHTML(html));
}
exports.default = modifyHTML;
const injectFile = path_1.join(__dirname, '../assets/inject.html');
let injectContent;
function injectHTML(html) {
    var _a, _b;
    const containerTag = '<div id="lively-container" style="position:relative;width:100%;height:100%">';
    const bodyStart = ((_a = html.match(/(?<=<body>)[\s\S]/)) === null || _a === void 0 ? void 0 : _a.index) | 0;
    html = addAtIndex(html, containerTag, bodyStart);
    const bodyScriptStart = ((_b = html.match(/((?<=<body>[\s\S]*)|(?<!<head>[\s\S]*))<script/)) === null || _b === void 0 ? void 0 : _b.index) | 0;
    html = addAtIndex(html, '</div>' + injectContent, bodyScriptStart);
    return html;
}
function injectCSS(html) {
    return html;
}
function addAtIndex(str, substr, index) {
    return str.slice(0, index) + substr + str.slice(index);
}
(function () {
    return __awaiter(this, void 0, void 0, function* () {
        injectContent = fs_1.readFileSync(injectFile, 'utf8');
    });
})();
//# sourceMappingURL=modifyHTML.js.map