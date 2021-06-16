/// <reference path="index.d.ts" />

declare const diffDOM: DiffDOMObject

const documents: { [key: string]: IframeDoc } = {};
void function() {
  const fileMessage = document.querySelector('#fileMessage') as HTMLElement;
  const dirtyLinks: { [key: string]: string } = {};
  const dd = new diffDOM.DiffDOM;
  const ws = new WebSocket('ws://' + location.host + location.pathname);
  let heartBeat: NodeJS.Timeout;
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
    writeStyle(newDoc.head);
    diffIframe(iframeDoc, newHTML);

    function modifyHTML(html: string) {
      const nbsp = String.fromCharCode(0x00A0);
      return html.replace(/&nbsp;/g, nbsp).replace(/=""/g, '');
    }
  });
  ws.on('alive', () => (
    clearTimeout(heartBeat),
    heartBeat = setTimeout(setDead, 500)
  ));
 
  async function createIframe(filePath: string, content: string) {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);

    const iframeDoc = documents[filePath] = iframe.contentDocument as IframeDoc;
    iframeDoc.iframe = iframe;
    showIframe(iframeDoc);

    const headContent = extractContent(content, 'head');
    if (headContent) {
      iframeDoc.head.innerHTML = headContent;
      writeStyle(iframeDoc.head);
      await activateScripts(iframeDoc.head);
    }
    iframeDoc.body.innerHTML = extractContent(content, 'body');
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
    });
    function generateStyleId(url: string) {
      const encodedUrl = btoa(encodeURIComponent(url)).replace(/[+/=]/g, '_');
      return 'lively-style-' + encodedUrl;
    }
  }
  
  async function activateScripts(el: HTMLElement) {
    const scripts = [...el.querySelectorAll('script')];
    await Promise.all(scripts.map(oldScript => new Promise((resolve, reject) => {
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
    })));
  }

  function diffIframe(iframeDoc: IframeDoc, newHTML: HTMLElement) {
    const el = iframeDoc.documentElement;
    const dom = diffDOM.nodeToObj(el);
    const oldDOM = iframeDoc.oldDOM;
    const newDOM = diffDOM.nodeToObj(newHTML);
    console.log('Raw HTML', oldDOM);
    console.log('Js-altered HTML', dom);
    console.log('Editor-modified HTML', newDOM);
    const toAmendedHTML = dd.diff(dom, newDOM);
    const toJSAlteration = dd.diff(oldDOM, dom);
    dd.apply(el, toAmendedHTML);
    dd.apply(el, toJSAlteration);
    iframeDoc.oldHTML = newHTML.outerHTML;
    iframeDoc.oldDOM = newDOM;
  }

  type HtmlMainTag = 'html' | 'body' | 'head';
  function extractContent(htmlContent: string, part: HtmlMainTag): string {
    let content;
    switch (part) {
      case 'body': 
        content = (htmlContent.match(/(?<=<body>).*(?=<\/body>)/i) || [''])[0];
        if (content !== '') return content;
        content = htmlContent
          .replace(/.*<html>(.*)<\/html>.*/i, '$1')
          .replace(/<(head|style|title).*>.*?<\/\1>|<(link|meta).*?>/gi, '');
        return content;
      case 'head':
        content = (htmlContent.match(/(?<=<head>).*(?=<\/head>)/i) || [''])[0];
        if (content !== '') return content;
        content = (
          htmlContent.match(/<(style|title).*>.*?<\/\1>|<(link|meta).*?>/gi) ||
          []
        ).join('');
        return content;
      case 'html':
        const head = '<head>' + extractContent(htmlContent, 'head') + '</head>';
        const body = '<body>' + extractContent(htmlContent, 'body') + '</body>';
        return head + body;
    }
  }

  type Animation = 'show' | 'hide' | 'fade' | 'twinkle';
  function showMessage(msg: string, type: 'info' | 'warn', anim: Animation) {
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
}();

function stringifyDOM(dom: DiffDOMNode, lvl = 1): string {
  const tab = '\n' + '  '.repeat(lvl);
  if (!['HTML', 'HEAD', 'BODY'].includes(dom.nodeName)) {
    return tab + stringifyFilter(dom);
  }
  return `{${tab}${dom.nodeName},${tab}[${
    dom.childNodes!.map(child => stringifyDOM(child, lvl + 1)).join()
  }${tab}]${tab}}`;
}

function stringifyDiff(diff: DiffDOMDiff[]) {
return diff.map(({ action, route, element, oldValue, newValue }) => `{
  ${action.replace(/[A-Z]/g, c => '_' + c).toUpperCase()} : ${route},${
  element ? `
  ${stringifyFilter(element)}` : ''}${
  oldValue ? `
  old: ${stringifyFilter(oldValue)},` : ''}${
  newValue ? `
  new: ${stringifyFilter(newValue)}` : ''}
}`).join(', ');
}

function stringifyFilter(node: string | DiffDOMNode) {
  return JSON.stringify(node, ['nodeName', 'childNodes', 'data', 'oldData'])
    .replace(/"nodeName":/g, '')
    .replace(/"childNodes"/g, 'kids');
}