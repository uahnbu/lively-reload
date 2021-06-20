/// <reference path="index.d.ts" />

declare const diffDOM: DiffDOMObject

const documents: { [key: string]: IframeDoc } = {};
const fileMessage = document.querySelector('#fileMessage') as HTMLElement;
const dirtyLinks: { [key: string]: string } = {};
const dd = new diffDOM.DiffDOM;
const ws = new WebSocket('ws://' + location.host + location.pathname);
let heartBeat: NodeJS.Timeout;
let debug = false;
ws.events = {}, ws.on = (event, handler) => ws.events[event] = handler;
ws.addEventListener('message', ({ data: msg }) => {
  const { task, data } = JSON.parse(msg);
  ws.events[task] && ws.events[task](JSON.parse(data));
});
ws.addEventListener('open', () => (
  document.querySelector('#initMessage')!.textContent = (
    'Connection established. Open a .html/.pug file to begin.'
  ),
  ws.send('connect')
));

type ModifiedAbsoluteFile = { filePath: string, content: string };
type ModifiedRelativeFile = { fileRel: string, content: string };
ws.on('reloadFull', () => location.reload());
ws.on('reloadJS', (fileRel: string) => {
  for (const htmlPath in documents) {
    const iframeDoc = documents[htmlPath];
    const script = [...iframeDoc.querySelectorAll('script')].find(script => (
      script.src.startsWith(location.href) &&
      script.src.slice(location.href.length) === fileRel
    ));
    if (!script) continue;
    log('Reloading a document containing the saved script...', 'info');
    document.body.removeChild(iframeDoc.iframe);
    createIframe(htmlPath, iframeDoc.oldHTML);
  }
});
ws.on('injectCSS', ({ fileRel, content }: ModifiedRelativeFile) => {
  for (const htmlPath in documents) {
    writeStyle(documents[htmlPath].head, fileRel, content)
  }
});
ws.on('switchHTML', ({ filePath, content }: ModifiedAbsoluteFile) => {
  const initMessage = document.querySelector('#initMessage');
  initMessage && document.body.removeChild(initMessage);
  let iframeDoc = documents[filePath];
  showMessage(filePath, 'info', 'fade');
  if (iframeDoc) showIframe(iframeDoc); else createIframe(filePath, content);
});
ws.on('editHTML', ({ filePath, content }: ModifiedAbsoluteFile) => {
  const iframeDoc = documents[filePath];
  const newDoc = document.implementation.createHTMLDocument();
  const newHTML = newDoc.documentElement;
  newHTML.innerHTML = content = modifyHTML(extractContent(content, 'html'));
  
  const testHTML = modifyHTML(newHTML.innerHTML);
  if (testHTML !== content) return;
  if (!/<(“[^”]*”|'[^’]*’|[^'”>])*>/.test(testHTML)) return;
  log('Changing HTML content...', 'info');
  writeStyle(newDoc.head);
  diffIframe(iframeDoc, newHTML);

  function modifyHTML(html: string) {
    const nbsp = String.fromCharCode(0x00A0);
    return html.replace(/&nbsp;/g, nbsp).replace(/=""/g, '');
  }
});
ws.on('alive', ({ debug: willEnableDebug }: { debug: boolean }) => (
  debug = willEnableDebug,
  clearTimeout(heartBeat),
  heartBeat = setTimeout(setDead, 500)
));

async function createIframe(filePath: string, content: string) {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  log('Opening a new HTML/Pug file...', 'info');

  const iframeDoc = documents[filePath] = iframe.contentDocument as IframeDoc;
  iframeDoc.iframe = iframe;
  showIframe(iframeDoc);

  const headContent = extractContent(content, 'head');
  log(headContent, 'Head Tag');
  if (headContent) {
    iframeDoc.head.innerHTML = headContent;
    writeStyle(iframeDoc.head);
    await activateScripts(iframeDoc.head);
  }
  log(iframeDoc.body.innerHTML = extractContent(content, 'body'), 'Body Tag');
  iframeDoc.oldHTML = iframeDoc.documentElement.outerHTML;
  iframeDoc.oldDOM = diffDOM.nodeToObj(iframeDoc.documentElement);
  activateScripts(iframeDoc.body);
}

function showIframe(iframeDoc: IframeDoc) {
  const iframes = [...document.querySelectorAll('iframe')];
  const docIframe = iframeDoc.iframe;
  iframes.forEach(iframe => iframe !== docIframe && (
    iframe.animate(
      { opacity: 0, zIndex: 0 },
      { duration: 500, fill: 'forwards' }
    )
  ));
  docIframe.animate(
    { opacity: 1, zIndex: 1 },
    { duration: 500, fill: 'forwards' }
  );
}

function writeStyle(el: HTMLElement, fileRel?: string, content?: string) {
  let links = [...el.querySelectorAll('link')];
  if (fileRel) {
    const id = generateStyleId(fileRel);
    dirtyLinks[id] = content!;
    links = links.filter(link => (
      link.href.startsWith(location.href) &&
      link.href.slice(location.href.length) === fileRel
    ));
    if (!links.length) {
      log('Updating style tag id ' + id + '...', 'info');
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
    style.id = id;
    style.textContent = content;
    el.insertBefore(style, link);
    el.removeChild(link);
    log('Replacing link tag with style tag id ' + id + '...', 'info');
  });
  function generateStyleId(url: string) {
    const encodedUrl = btoa(encodeURIComponent(url)).replace(/[+/=]/g, '_');
    return 'lively-style-' + encodedUrl;
  }
}

async function activateScripts(el: HTMLElement) {
  const scripts = [...el.querySelectorAll('script')];
  log('Loading ' + scripts.length + ' script(s)...', 'info');
  try { await Promise.all(scripts.map(script => migrateScript(script))) }
  catch(e) { throw Error(e) }

  function migrateScript(oldScript: HTMLScriptElement) {
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
}

function diffIframe(iframeDoc: IframeDoc, newHTML: HTMLElement) {
  const el = iframeDoc.documentElement;
  const dom = diffDOM.nodeToObj(el);
  const oldDOM = iframeDoc.oldDOM;
  const newDOM = diffDOM.nodeToObj(newHTML);
  debug && (
    log([oldDOM, yamlDOM(oldDOM)], 'Raw HTML (1)'),
    log([dom, yamlDOM(dom)], 'Js-altered HTML (2)'),
    log([newDOM, yamlDOM(newDOM)], 'Editor-modified HTML (3)')
  );

  const toAmendedHTML = dd.diff(dom, newDOM);
  const toJSAlteration = dd.diff(oldDOM, dom);
  debug && (
    log([toAmendedHTML, yamlDOM(toAmendedHTML)], '1 → 2'),
    log([toJSAlteration, yamlDOM(toJSAlteration)], '2 → 3')
  );
  dd.apply(el, toAmendedHTML);
  dd.apply(el, toJSAlteration);
  iframeDoc.oldHTML = newHTML.outerHTML;
  iframeDoc.oldDOM = newDOM;
}

type HtmlMainTag = 'html' | 'body' | 'head';
function extractContent(htmlContent: string, part: HtmlMainTag): string {
  let content;
  if (part === 'body') {
    content = (htmlContent.match(/(?<=<body>).*(?=<\/body>)/i) || [''])[0];
    if (content !== '') return content;
    content = htmlContent
      .replace(/.*<html>(.*)<\/html>.*/i, '$1')
      .replace(/<(head|style|title).*>.*?<\/\1>|<(link|meta).*?>/gi, '');
    return content;
  }
  if (part === 'head') {
    content = (htmlContent.match(/(?<=<head>).*(?=<\/head>)/i) || [''])[0];
    if (content !== '') return content;
    content = (
      htmlContent.match(/<(style|title).*>.*?<\/\1>|<(link|meta).*?>/gi) ||
      []
    ).join('');
    return content;
  }
  const head = '<head>' + extractContent(htmlContent, 'head') + '</head>';
  const body = '<body>' + extractContent(htmlContent, 'body') + '</body>';
  return head + body;
}

type Anim = 'show' | 'hide' | 'fade' | 'twinkle';
function showMessage(msg: string, type: 'info' | 'warn', anim: Anim) {
  const animSet = {
    show: [0, 1],
    hide: [1, 0],
    fade: [0, 1, 1, 1, 0],
    twinkle: [1, 0, 1],
  };
  fileMessage.innerHTML = msg;
  fileMessage.classList.remove('info', 'warn');
  fileMessage.classList.add(type);
  fileMessage.animate(
    animSet[anim].map(val => ({ opacity: val, zIndex: val * 99 })),
    { duration: (animSet[anim].length - 1) * 500, fill: 'forwards' }
  );
}

function setDead() {
  showMessage('Server disconnected.', 'warn', 'show');
}

function prettifyDOM(node: DiffDOMNode) {
  node.attributes?.class && (node.nodeName += '.' + node.attributes.class);
  node.attributes?.id && (node.nodeName += '#' + node.attributes.id);
  node.childNodes?.forEach(child => prettifyDOM(child));
  return node;
}

function log(msg: string | any[], type?: string) {
  if (!debug) return;
  if (type === 'info') {
    console.info('%c' + (msg as string), 'color: #c83');
    return;
  }
  console.groupCollapsed(type);
  if (typeof msg === 'string') console.log(msg);
  else msg.forEach(msg => console.log(msg));
  console.groupEnd();
}

function yamlDOM(node: any, tab = 2) {
  return (function dfs(node, lvl, feed) {
    const gap = feed ? ' ' : '';
    if (isLeaf(node)) return gap + node;
    if (Array.isArray(node)) {
      if (node.length === 0) return gap + '[]';
      const isPetiole = node.every(e => isLeaf(e));
      let str = '', key = ', ' + str;
      !isPetiole && (
        str = '- ', key = '\n' + ' '.repeat(tab * lvl) + str,
        feed && (str = key)
      );
      str += dfs(node[0], ++lvl, false);
      for (let i = 1; i < node.length; i++) {
        str += key + dfs(node[i], lvl, false);
      }
      return isPetiole ? gap + '[' + str + ']' : str;
    }
    let keys = 0;
    for (const _prop in node) { ++keys }
    if (keys === 0) return gap + '{}';
    const key = '\n' + ' '.repeat(tab * lvl++);
    let str = '';
    for (const prop in node) {
      if (prop === 'toString' || prop === 'setValue') continue;
      if (prop === 'attributes') {
        const attributes = node.attributes;
        let keys = 0;
        for (const _prop in attributes) { ++keys }
        if (keys === 1 && (attributes.id || attributes.class)) continue;
        if (keys === 2 && attributes.id && attributes.class) continue;
        for (const prop in attributes) {
          if (prop === 'id' || prop === 'class') continue;
          const val = dfs(attributes[prop], lvl, true);
          str += key + '\x1b[35m' + prop + '\x1b[39m:' + val;
        }
        continue;
      }
      (feed || !feed && str !== '') && (str += key);
      if (prop === 'nodeName') {
        str += '\x1b[35mnodeName\x1b[39m: ' + node.nodeName;
        node.attributes?.class && (
          str += '.' + node.attributes.class.split(' ').join('.')
        );
        node.attributes?.id && (str += '#' + node.attributes.id);
        continue;        
      }
      if (prop === 'childNodes' && node.childNodes[0].nodeName === '#text') {
        str += '\x1b[35mdata\x1b[39m: ' + node.childNodes[0].data;
        continue;
      }
      str += '\x1b[35m' + prop + '\x1b[39m:' + dfs(node[prop], lvl, true);
    }
    return str;    
  })(node, 0, false);
  function isLeaf(node: any) {
    return typeof node === 'boolean' ||
      typeof node === 'string' ||
      typeof node === 'number' ||
      typeof node === 'bigint' ||
      node === void 0 || node === null;
  }
}

export function yamlify(node: any, tab = 2) {
  return (function dfs(node, lvl, feed, seen) {
    const gap = feed ? ' ' : '';
    if (seen.has(node)) return gap + '{circular}';
    if (isSpecialString(node)) return gap + '\'' + node + '\'';
    if (node === void 0) return gap + 'null';
    if (isLeaf(node)) return gap + node;
    seen.add(node);
    if (Array.isArray(node)) {
      if (node.length === 0) return gap + '[]';
      const isPetiole = node.every(e => isLeaf(e));
      let str = '', key = ', ' + str;
      !isPetiole && (
        str = '- ', key = '\n' + ' '.repeat(tab * lvl) + str,
        feed && (str = key)
      );
      str += dfs(node[0], ++lvl, false, seen);
      for (let i = 1; i < node.length; i++) {
        str += key + dfs(node[i], lvl, false, seen);
      }
      return isPetiole ? gap + '[' + str + ']' : str;
    }
    let keys = 0;
    for (const prop in node) { node[prop] !== void 0 && ++keys }
    if (keys === 0) return gap + '{}';
    const key = '\n' + ' '.repeat(tab * lvl++);
    let str = '';
    for (const prop in node) {
      if (node[prop] === void 0) continue;
      (feed || !feed && str !== '') && (str += key);
      str += prop + ':' + dfs(node[prop], lvl, true, seen);
    }
    return str;    
  })(node, 0, false, new Set);
  function isSpecialString(node: any) {
    return typeof node === 'string' && /[[\]{}:',-]/.test(node);
  }
  function isLeaf(node: any) {
    return typeof node === 'boolean' ||
      typeof node === 'string' ||
      typeof node === 'number' ||
      typeof node === 'bigint' ||
      node === void 0 || node === null;
  }
}