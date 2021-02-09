import { readFileSync } from 'fs';
import { join } from 'path';

export default function modifyHTML(html: string) {
  return injectCSS(injectHTML(html));
}

const injectFile = join(__dirname, '../assets/inject.html');
let injectContent: string;

function injectHTML(html: string) {
  const containerTag = '<div id="lively-container" style="position:relative;width:100%;height:100%">';
  const bodyStart = html.match(/(?<=<body>)[\s\S]/)?.index! | 0;
  html = addAtIndex(html, containerTag, bodyStart);

  const bodyScriptStart = html.match(/((?<=<body>[\s\S]*)|(?<!<head>[\s\S]*))<script/)?.index! | 0;
  html = addAtIndex(html, '</div>' + injectContent, bodyScriptStart);
  return html;
}

function injectCSS(html: string) {
  return html;
} 

function addAtIndex(str: string, substr: string, index: number) {
  return str.slice(0, index) + substr + str.slice(index);
}

(async function() {
  injectContent = readFileSync(injectFile, 'utf8');
})();