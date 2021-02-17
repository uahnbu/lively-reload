interface WebSocket {
  events: { [task: string]: (data: any) => void }
  on: (event: any, handler: any) => {}
}

interface IframeDoc extends Document {
  iframe: HTMLIFrameElement
  oldDOM: {}
}

declare const diffDOM: any;

void function() {
  const fileMessage = document.querySelector('#fileMessage') as HTMLElement;
  const documents: { [key: string]: IframeDoc } = {};
  const dirtyLinks: { [key: string]: string } = {};
  const dd = new diffDOM.DiffDOM;
  const ws = new WebSocket('ws://' + location.host + location.pathname);
  ws.events = {}, ws.on = (event, handler) => ws.events[event] = handler;
  ws.addEventListener('message', ({ data: msg }) => {
    const { task, data } = JSON.parse(msg);
    ws.events[task] && ws.events[task](JSON.parse(data));
  });
  ws.addEventListener('open', () => (
    document.querySelector('#initMessage')!.textContent = (
      'Connection established. Open a .html/.pug file to begin.'
    ),
    ws.send('connect'))
  );

  ws.on('disconnect', () => showMessage('Server disconnected.', 'warn', 'show'));
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
    iframes.forEach(iframe => iframe !== docIframe && iframe.classList.add('hidden'));
    docIframe.classList.remove('hidden');
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
        const style = el.querySelector('#\\' + id);
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
      let src = oldScript.src;
      src.startsWith(location.href) && (src = src.slice(location.href.length));
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      el.removeChild(oldScript);
      el.appendChild(script);
    })));
  }

  function diffIframe(iframeDoc: IframeDoc, newHTML: HTMLElement) {
    const el = iframeDoc.documentElement;
    const dom = diffDOM.nodeToObj(el);
    const newDOM = diffDOM.nodeToObj(newHTML);
    const toAmendedHTML = dd.diff(dom, newDOM);
    const toJSAlteration = dd.diff(iframeDoc.oldDOM, dom);
    dd.apply(el, toAmendedHTML);
    iframeDoc.oldDOM = diffDOM.nodeToObj(el);
    dd.apply(el, toJSAlteration);
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
      animSet[anim].map(val => ({ opacity: val })),
      { duration: (animSet[anim].length - 1) * 500, fill: 'forwards' }
    );
  }
}();