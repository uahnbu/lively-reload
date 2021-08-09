import { DiffDOM, nodeToObj } from 'diff-dom';
import { YAMLDOM } from './yaml';
import { log, showIframe } from './modifyGUI';
import { highlightHtml } from './highlight';
import { sendMessage } from '..';

const yamlDOM = new YAMLDOM;
const yamlifyDOM = yamlDOM.yamlify.bind(yamlDOM);

const dd = new DiffDOM;
const dirtyLinks: { [key: string]: string } = {};

export async function createIframe(content: string, filePath: string) {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  iframe.contentDocument?.readyState !== 'complete' && (
    await new Promise(resolve => iframe.addEventListener('load', resolve))
  );

  const iframeDoc = iframe.contentDocument as IframeDoc;
  log('Opening a new HTML/Pug file...', 'info');
  iframeDoc.iframe = iframe;
  iframeDoc.addEventListener('scroll', () => highlightHtml(iframeDoc), true);
  iframeDoc.addEventListener('click', e => {
    const target = e.target as HTMLElement | null;
    const position = +(target?.getAttribute('lively-position') || -1);
    if (position === -1) return;
    sendMessage('focus', { position, filePath });
  });
  showIframe(iframeDoc);
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

async function activateScripts(el: HTMLElement) {
  const scripts = [...el.querySelectorAll('script')];
  log('Loading ' + scripts.length + ' script(s)...', 'info');
  try {
    await Promise.all(scripts.map(script => migrateScript(el, script)));
  } catch(e) { throw Error(e) }
}

function migrateScript(el: HTMLElement, oldScript: HTMLScriptElement) {
  return new Promise((resolve, reject) => {
    const script = el.ownerDocument.createElement('script');
    const { src, textContent } = oldScript;
    src && (
      script.src = src.startsWith(location.href) &&
      src.slice(location.href.length) || src
    );
    script.textContent = textContent;
    script.onload = resolve;
    script.onerror = reject;
    el.removeChild(oldScript);
    el.appendChild(script);
  });
}

export function modifyHTML(iframeDoc: IframeDoc, content: string) {
  const newDoc = document.implementation.createHTMLDocument();
  const newHTML = newDoc.documentElement;
  log('Changing HTML content...', 'info');
  newHTML.innerHTML = extractContent(content, 'html');
  writeStyle(newDoc.head);
  diffIframe(iframeDoc, newHTML);
}

export function writeStyle(
  el: HTMLElement,
  fileRel?: string,
  content?: string
) {
  let links = [...el.querySelectorAll('link')];
  if (fileRel) {
    const id = generateStyleId(fileRel);
    dirtyLinks[id] = content!;
    links = links.filter(link => (
      link.href.startsWith(location.href) &&
      link.href.slice(location.href.length) === fileRel
    ));
    if (!links.length) {
      log('Updating style tag id "' + id + '"...', 'info');
      const style = el.querySelector('#' + id);
      style && (style.textContent = content!);
      return;
    }
  }

  links.forEach(link => {
    const href = link.href.startsWith(location.href) &&
      link.href.slice(location.href.length) || link.href;
    const id = generateStyleId(href);
    if (content) dirtyLinks[id] = content; else content = dirtyLinks[id];
    if (!content) return;
    
    const style = document.createElement('style');
    style.id = id, style.textContent = content;
    el.insertBefore(style, link), el.removeChild(link);
    log('Replacing link tag with style tag id "' + id + '"...', 'info');
  });

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
      .replace(/.*<html.*?>(.*)<\/html>.*/i, '$1')
      .replace(/<(head|style|title).*?>.*?<\/\1>|<(link|meta).*?>/gi, '');
    return bodyExtracted;
  }
  if (part === 'head') {
    const headMatch = htmlContent.match(/(?<=<head.*?>).*(?=<\/head>)/i);
    if (headMatch) return headMatch[0];

    const headExtracted = htmlContent
      .match(/<(style|title).*?>.*?<\/\1>|<(link|meta).*?>/gi);
    return headExtracted?.join('') || '';
  }
  const head = '<head>' + extractContent(htmlContent, 'head') + '</head>';
  const body = '<body>' + extractContent(htmlContent, 'body') + '</body>';
  return head + body;
}

function diffIframe(iframeDoc: IframeDoc, newHTML: HTMLElement) {
  const el = iframeDoc.documentElement;
  const dom = nodeToObj(el);
  const oldDOM = iframeDoc.oldDOM;
  const newDOM = nodeToObj(newHTML);
  log([oldDOM, yamlifyDOM(oldDOM)], 'Raw HTML (1)'),
  log([dom, yamlifyDOM(dom)], 'Js-altered HTML (2)'),
  log([newDOM, yamlifyDOM(newDOM)], 'Editor-modified HTML (3)')

  const toAmendedHTML = dd.diff(dom, newDOM);
  const toJSAlteration = dd.diff(oldDOM, dom);
  modifyDiffs(toJSAlteration, toAmendedHTML);
  log([toAmendedHTML, yamlifyDOM(toAmendedHTML)], '2 → 3'),
  log([toJSAlteration, yamlifyDOM(toJSAlteration)], '1 → 2')
  dd.apply(el, toAmendedHTML);
  dd.apply(el, toJSAlteration);
  iframeDoc.oldHTML = newHTML.outerHTML;
  iframeDoc.oldDOM = newDOM;
}

function modifyDiffs(diffs: DiffDOMDiff[], base: DiffDOMDiff[]) {
  base.forEach(({ action, route, groupLength: size, from, to }) => {
    action === 'addElement' && shiftDiffs(diffs, route, 1);
    action === 'removeElement' && shiftDiffs(diffs, route, -1);
    action === 'relocateGroup' && shiftDiffs(diffs, route, size, from, to);
  });
}

function shiftDiffs(
  diffs: DiffDOMDiff[],
  baseRoute: number[],
  vector: number,
  tail?: number,
  head?: number
) {
  const lastPoint = baseRoute.length - +!head;
  diffs.forEach(({route}) => {
    if (route.length < lastPoint + 1) return;
    for (let i = 0; i < lastPoint; ++i) {
      if (route[i] !== baseRoute[i]) return;
    }
    if (!tail) {
      if (route[lastPoint] < baseRoute[lastPoint]) return;
      route[lastPoint] += vector;
      return;
    }
    if (route[lastPoint] >= tail) {
      if (route[lastPoint] < tail + vector) {
        route[lastPoint] += head! - tail;
        return;
      }
      route[lastPoint] -= vector;
    }
    if (route[lastPoint] >= head!) route[lastPoint] += vector;
  })
}