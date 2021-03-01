interface WebSocket {
  events: { [task: string]: (data: any) => void }
  on: (event: any, handler: any) => {}
}

interface IframeDoc extends Document {
  iframe: HTMLIFrameElement
  oldDOM: DiffDOMNode
}

interface DiffDOMNode {
  nodeName: string
  data?: string
  childNodes?: DiffDOMNode[],
  hasMarked?: boolean,
  oldData?: DiffDOMNode
}

interface DiffDOMDiff {
  action: string,
  route: number[],
  name?: string,
  value?: string,
  oldValue?: DiffDOMNode,
  newValue?: DiffDOMNode,
  element?: DiffDOMNode,
}

interface DiffDomConstructor {
  diff(node1: HTMLElement | DiffDOMNode, node2: HTMLElement | DiffDOMNode): DiffDOMDiff[]
  apply(node: HTMLElement | DiffDOMNode, diff: DiffDOMDiff[]): boolean
  new(): DiffDomConstructor
}

interface DiffDOMObject {
  nodeToObj(node: HTMLElement): DiffDOMNode
  DiffDOM: DiffDomConstructor
}

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

  ws.on('reloadFull', () => location.reload());
  ws.on('reloadJS', (fileRel: string) => {
    for (const htmlPath in documents) {
      const iframeDoc = documents[htmlPath];
      const script = [...iframeDoc.querySelectorAll('script')].find(script => (
        script.src.startsWith(location.href) &&
        script.src.slice(location.href.length) === fileRel
      ));
      script && (
        document.body.removeChild(iframeDoc.iframe),
        createIframe(htmlPath, iframeDoc.documentElement.innerHTML)
      );
    }
  });
  ws.on('injectCSS', ({ fileRel, content }: { fileRel: string, content: string }) => {
    for (const htmlPath in documents) {
      const iframeDoc = documents[htmlPath];
      writeStyle(iframeDoc.head, fileRel, content);
    }
  });
  ws.on('switchHTML', ({ filePath, content }: { filePath: string, content: string }) => {
    const initMessage = document.querySelector('#initMessage');
    initMessage && document.body.removeChild(initMessage);
    let iframeDoc = documents[filePath];
    showMessage(filePath, 'info', 'fade');
    if (iframeDoc) showIframe(iframeDoc); else createIframe(filePath, content);
  });
  ws.on('editHTML', ({ filePath, content }: { filePath: string, content: string }) => {
    const iframeDoc = documents[filePath];
    const newDoc = document.implementation.createHTMLDocument();
    const newHTML = newDoc.documentElement;
    newHTML.innerHTML = content = extractContent(content, 'html');
    
    const testHTML = newHTML.innerHTML.replace(/&nbsp;/g, String.fromCharCode(0x00A0));
    if (testHTML !== content) return;
    writeStyle(newDoc.head);
    diffIframe(iframeDoc, newHTML);
  });
  ws.on('alive', () => (clearTimeout(heartBeat), heartBeat = setTimeout(setDead, 500)));
 
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
    iframeDoc.oldDOM = diffDOM.nodeToObj(iframeDoc.documentElement);
    activateScripts(iframeDoc.body);
  }

  function showIframe(iframeDoc: IframeDoc) {
    const iframes = [...document.querySelectorAll('iframe')];
    const docIframe = iframeDoc.iframe;
    iframes.forEach(iframe => iframe !== docIframe && (
      iframe.animate({ opacity: 0, zIndex: 0 }, { duration: 500, fill: 'forwards' })
    ));
    docIframe.animate({ opacity: 1, zIndex: 1 }, { duration: 500, fill: 'forwards' });
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
      const href = link.href.startsWith(location.href) && link.href.slice(location.href.length) || link.href;
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
      return 'lively-style-' + btoa(encodeURIComponent(url)).replace(/[+/=]/g, '_');
    }
  }
  
  async function activateScripts(el: HTMLElement) {
    const scripts = [...el.querySelectorAll('script')];
    await Promise.all(scripts.map(oldScript => new Promise((resolve, reject) => {
      const script = el.ownerDocument.createElement('script');
      const { src, textContent } = oldScript;
      src && (script.src = src.startsWith(location.href) && src.slice(location.href.length) || src);
      script.textContent = textContent;
      script.onload = resolve;
      script.onerror = reject;
      el.removeChild(oldScript);
      el.appendChild(script);
    })));
  }

  function diffIframe(iframeDoc: IframeDoc, newHTML: HTMLElement) {
    const el = iframeDoc.documentElement;
    const dom = replaceIgnoredDOM(diffDOM.nodeToObj(el));
    const oldDOM = replaceIgnoredDOM(iframeDoc.oldDOM);
    const newDOM = replaceIgnoredDOM(diffDOM.nodeToObj(newHTML));

    const reJSAlteration = filterDiff(dd.diff(dom, oldDOM));
    const toJSAlteration = filterDiff(dd.diff(oldDOM, dom));
    const toAmendedHTML = filterDiff(dd.diff(oldDOM, newDOM));
    dd.apply(el, reJSAlteration);
    dd.apply(el, toAmendedHTML);
    dd.apply(el, toJSAlteration);
    iframeDoc.oldDOM = diffDOM.nodeToObj(newHTML);

    function filterDiff(diffs: DiffDOMDiff[]) {
      return diffs
        .filter(({ element, newValue }) => !(
          element?.nodeName === '#none' ||
          newValue?.nodeName === '#none'
        ))
        .filter(({ element }) => !element || !diffs.some(({ element: otherEl }) => (
          otherEl !== element && otherEl?.oldData &&
          otherEl.oldData.nodeName === element.nodeName &&
          dd.diff(otherEl.oldData, element!).length === 0
        )));
    }
  }

  function replaceIgnoredDOM(root: DiffDOMNode) {
    root = keepOrReplaceDOM(root);
    if (root.nodeName === '#none') return root.oldData as DiffDOMNode;
    return root;
  
    function isMarkedDOM(root: DiffDOMNode): boolean {
      if (
        root.nodeName === '#comment' &&
        root.data!.toLowerCase().trimEnd().endsWith('lively-container>')
      ) return true;
      if (typeof root.hasMarked !== 'undefined') return root.hasMarked;
      return (
        root.childNodes as unknown as boolean &&
        (root.hasMarked = root.childNodes!.some(child => isMarkedDOM(child))
      ));
    }

    function keepOrReplaceDOM(root: DiffDOMNode) {
      if (!isMarkedDOM(root)) return { nodeName: '#none', oldData: root };
      const hood = root.childNodes!;
      const boxLeft = findBox('left');
      const boxRight = findBox('right');
      if (boxLeft === -1 && boxRight === -1) {
        hood.forEach((_, i) => hood[i] = keepOrReplaceDOM(hood[i]));
        return root;
      }
      for (let i = 0; i < boxLeft; i++) { hood[i] = keepOrReplaceDOM(hood[i]) }
      if (boxRight !== -1) {
        for (let i = boxRight + 1; i < hood.length; i++) { hood[i] = keepOrReplaceDOM(hood[i]) }
      }
      return root;
  
      function findBox(end: 'left' | 'right') {
        return hood!.findIndex(({ nodeName, data }) => (
          nodeName === '#comment' &&
          data!.toLowerCase().trim() === '<' + (end === 'left' ? '' : '/') + 'lively-container>'
        ));
      }
    }
  }

  function extractContent(htmlContent: string, part: 'html' | 'body' | 'head'): string {
    let content;
    switch (part) {
      case 'body': 
        content = (htmlContent.match(/(?<=<body>).*(?=<\/body>)/i) || [''])[0];
        content === '' && (
          content = htmlContent.replace(/.*<html>(.*)<\/html>.*/i, '$1'),
          content = content.replace(/<(head|style|title).*>.*?<\/\1>|<(link|meta).*?>/gi, '')
        );
        return content;
      case 'head':
        content = (htmlContent.match(/(?<=<head>).*(?=<\/head>)/i) || [''])[0];
        content === '' && (content = (
          (htmlContent.match(/<(style|title).*>.*?<\/\1>|<(link|meta).*?>/gi) || []).join('')
        ));
        return content;
      case 'html':
        const head = '<head>' + extractContent(htmlContent, 'head') + '</head>';
        const body = '<body>' + extractContent(htmlContent, 'body') + '</body>';
        return head + body;
    }
  }

  function showMessage(msg: string, type: 'info' | 'warn', anim: 'show' | 'hide' | 'fade' | 'twinkle') {
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

  function setDead() { showMessage('Server disconnected.', 'warn', 'show') }
}();