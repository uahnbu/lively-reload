import { readFileSync } from 'fs';
import { join } from 'path';

const injectFile = join(__dirname, '../assets/inject.html');

let injectContent: string;
(async () => injectContent = readFileSync(injectFile, 'utf8'))();

export default function modifyHTML(html: string) {
  return injectHTML(html);
}

function injectHTML(html: string) {
  const containerTag = '<div id="lively-container" style="position:relative;width:100%;height:100%">';
  const bodyStart = html.match(/(?<=<body>)[\s\S]/)?.index! | 0;
  html = addAtIndex(html, containerTag, bodyStart);
  const bodyScriptStart = html.match(/((?<=<body>[\s\S]*)|(?<!<head>[\s\S]*))<script/)?.index! | 0;
  html = addAtIndex(html, '</div>' + injectContent, bodyScriptStart);
  return html;
}

function addAtIndex(str: string, substr: string, index: number) {
  return str.slice(0, index) + substr + str.slice(index);
}