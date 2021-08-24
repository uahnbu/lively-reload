import { DiffDOM, nodeToObj } from 'diff-dom';
import { YAMLDOM } from './yaml';
import { log, addShowingAttribute } from './modifyGUI';
import { highlightHtml } from './highlight';
import { sendMessage } from '..';

const yamlDOM = new YAMLDOM;
const yamlifyDOM = yamlDOM.yamlify.bind(yamlDOM);

const dd = new DiffDOM;
const dirtyLinks: { [key: string]: string } = {};

export async function createIframe(
  content : string,
  filePath: string,
  fileRel : string
) {
  const iframe = document.createElement('iframe');
  // Set the iframe location to localhost instead of about:blank to allow
  // replacing history state.
  // Iframe src must be specified before iframe is added to DOM.
  iframe.src = 'liveLy_blank.html';
  document.body.appendChild(iframe);
  await new Promise(resolve => {
    iframe.contentWindow!.addEventListener('load', resolve);
  });

  const iframeDoc = iframe.contentDocument as IframeDoc;
  log(content, `Opening HTML/Pug file ${filePath}...`);
  // Set the URL of the iframe without redirecting so as to correctly set up
  // hrefs and srcs and resource requests.
  // If fileRel is empty string, there's no folder opened in VSCode.
  fileRel && iframe.contentWindow!.history.replaceState({}, '', fileRel);
  Object.assign(iframeDoc, { filePath, fileRel, iframe });
  // Set useCapture to true to capature childNodes' scrollings.
  iframeDoc.addEventListener('scroll', () => highlightHtml(iframeDoc), true);
  iframeDoc.addEventListener('click', e => {
    const target = e.target as HTMLElement | null;
    const position = +(target?.getAttribute('lively-position') || -1);
    if (position === -1) return;
    sendMessage('focus', { position, filePath });
  });
  iframe.contentWindow!.addEventListener('beforeunload', () => {
    sendMessage('unload');
  });
  addShowingAttribute(iframeDoc);
  loadContent(iframeDoc, content);
  return iframeDoc;
}

async function loadContent(iframeDoc: IframeDoc, content: string) {
  const headContent = extractContent(content, 'head');
  log(headContent, 'Head Tag');
  if (headContent) {
    iframeDoc.head.innerHTML = headContent;
    writeStyle(iframeDoc.head);
    await activateScripts(iframeDoc.head);
  }
  log(iframeDoc.body.innerHTML = extractContent(content, 'body'), 'Body Tag');
  iframeDoc.oldHTML = iframeDoc.documentElement.outerHTML;
  iframeDoc.oldDOM = nodeToObj(iframeDoc.documentElement);
  activateScripts(iframeDoc.body);
}

// Scripts added to DOM through innerHTML are not auto-executed and needed to be
// activated manually.
async function activateScripts(element: HTMLElement) {
  const scripts = [...element.querySelectorAll('script')];
  log('Loading ' + scripts.length + ' script(s)...', 'info');
  try {
    const promises = scripts.map(script => migrateScript(element, script));
    await Promise.all(promises);
  } catch(e) { throw Error(e) }
}

// Replace old scripts added through innerHTML by new ones.
function migrateScript(element: HTMLElement, oldScript: HTMLScriptElement) {
  return new Promise((resolve, reject) => {
    const script = element.ownerDocument.createElement('script');
    const { src, textContent } = oldScript;
    const location = element.ownerDocument.defaultView!.location.origin;
    const srcRel = src.startsWith(location) ? src.slice(location.length) : src;
    srcRel && (script.src = srcRel);
    script.textContent = textContent;
    script.onload = resolve;
    script.onerror = reject;
    oldScript.parentElement!.removeChild(oldScript);
    element.appendChild(script);
  });
}

export function modifyHTML(iframeDoc: IframeDoc, content: string) {
  const newDoc = document.implementation.createHTMLDocument();
  const newHTML = newDoc.documentElement;
  log(content, `Changing HTML content of file ${iframeDoc}...`);
  newHTML.innerHTML = extractContent(content, 'html');
  writeStyle(newDoc.head);
  diffIframe(iframeDoc, newHTML);
}

// Reconvert previously edited link to the stored style contents when the iframe
// is reloaded.
export function writeStyle(headElement: HTMLElement): void
// Replace a specific link by new a style with the edited content in VSCode.
export function writeStyle(
  headElement: HTMLElement,
  content: string,
  fileRel: string
): void

export function writeStyle(
  headElement: HTMLElement,
  content?: string,
  fileRel?: string
) {
  const location = window.location.href;
  let links = [...headElement.querySelectorAll('link')];
  if (fileRel) {
    const id = generateStyleId(fileRel);
    dirtyLinks[id] = content!;
    links = links.filter(link => link.href === location + fileRel);
    // If there's already been an injected style for fileRel, update it.
    if (!links.length) {
      log(content!, `Updating style tag id "${id}"...`);
      const style = headElement.querySelector('#' + id);
      style && (style.textContent = content!);
      return;
    }
  }

  links.forEach(link => {
    const href = (
      link.href.startsWith(location) &&
      link.href.slice(location.length)
    ) || link.href;
    const id = generateStyleId(href);
    // If there's new content, store it, else set the content to the previously
    // stored one for converting link to style afterwards.
    if (content) dirtyLinks[id] = content; else content = dirtyLinks[id];
    // If there's no stored content for the href then quit.
    if (!content) return;
    const style = document.createElement('style');
    log(content, `Replacing link tag with style tag id "${id}"...`);
    style.id = id, style.textContent = content;
    headElement.insertBefore(style, link);
    headElement.removeChild(link);
  });

  // Create a unique id for the style.
  function generateStyleId(url: string) {
    const encodedUrl = btoa(encodeURIComponent(url)).replace(/[+/=]/g, '_');
    return 'lively-style-' + encodedUrl;
  }
}

function extractContent(htmlContent: string, part: HtmlMainTag): string {
  if (part === 'body') {
    const bodyMatch = htmlContent.match(/(?<=<body.*?>).*(?=<\/body>)/i);
    if (bodyMatch) return bodyMatch[0];
    const bodyExtracted = htmlContent
      // Remove html tags.
      .replace(/.*<html.*?>(.*)<\/html>.*/i, '$1')
      // Remove head tags.
      .replace(/<(head|style|title).*?>.*?<\/\1>|<(link|meta).*?>/gi, '');
    return bodyExtracted;
  }
  if (part === 'head') {
    const headMatch = htmlContent.match(/(?<=<head.*?>).*(?=<\/head>)/i);
    if (headMatch) return headMatch[0];
    const re = /<(style|title).*?>.*?<\/\1>|<(link|meta).*?>/gi;
    const headExtracted = htmlContent.match(re);
    return headExtracted?.join('') || '';
  }
  // The html, head, body tags' attributes are removed.
  const head = '<head>' + extractContent(htmlContent, 'head') + '</head>';
  const body = '<body>' + extractContent(htmlContent, 'body') + '</body>';
  return head + body;
}

function diffIframe(iframeDoc: IframeDoc, newHTML: HTMLElement) {
  const document = iframeDoc.documentElement;
  const dom = nodeToObj(document);
  const oldDOM = iframeDoc.oldDOM;
  const newDOM = nodeToObj(newHTML);
  log([oldDOM, yamlifyDOM(oldDOM)], 'Raw HTML (1)');
  log([dom, yamlifyDOM(dom)], 'Js-altered HTML (2)');
  log([newDOM, yamlifyDOM(newDOM)], 'Editor-modified HTML (3)');

  const toAmendedHTML = dd.diff(dom, newDOM);
  const toJSAlteration = dd.diff(oldDOM, dom);
  modifyDiffs(toJSAlteration, toAmendedHTML);
  log([toAmendedHTML, yamlifyDOM(toAmendedHTML)], '2 → 3');
  log([toJSAlteration, yamlifyDOM(toJSAlteration)], '1 → 2');
  // Transform current DOM to the new one with content edited in VSCode.
  dd.apply(document, toAmendedHTML);
  // Apply Js alterations made with the old DOM.
  dd.apply(document, toJSAlteration);
  iframeDoc.oldHTML = newHTML.outerHTML;
  iframeDoc.oldDOM = newDOM;
  writeStyle(iframeDoc.head);
}

// Shift routes of the elements correspond to the diffs based on whether
// previous diffs include adding or removing elements.
function modifyDiffs(diffs: DiffDOMDiff[], base: DiffDOMDiff[]) {
  base.forEach(({ action, route, groupLength: size, from, to }) => {
    action === 'addElement' && shiftDiffs(diffs, route, 1);
    action === 'removeElement' && shiftDiffs(diffs, route, -1);
    action === 'relocateGroup' && shiftDiffs(diffs, route, size, from, to);
  });
}

function shiftDiffs(
  diffs : DiffDOMDiff[],
  baseRoute: number[],
  vector: number,
  tail ?: number,
  head ?: number
) {
  const lastPoint = baseRoute.length - +!head;
  diffs.forEach(({route}) => {
    if (route.length < lastPoint + 1) return;
    for (let i = 0; i < lastPoint; ++i) {
      if (route[i] !== baseRoute[i]) return;
    }
    const step = route[lastPoint];
    // Shift last point of the route up or down 1 floor.
    if (!tail) {
      if (step < baseRoute[lastPoint]) return;
      // The basis route's last point is behind the examining route's last
      // point, hence affecting that point of the examining route.
      route[lastPoint] += vector;
      return;
    }
    //              1                  5
    // ===========             ↑
    //      |       2          |       6
    // -----------        ===========
    //      |       3                  7
    //      ↓             -----------
    //              4                  8
    head = head!;
    // Move the element from tail to head. (2, 7)
    step >= tail && step < tail + vector && (route[lastPoint] += head - tail);
    // Pull the element up. (3)
    step >= tail + vector && step < head! && (route[lastPoint] -= vector);
    // Push the element down. (6)
    step >= head && step < tail && (route[lastPoint] += vector);
  });
}