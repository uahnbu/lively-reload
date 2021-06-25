/// <reference path="index.d.ts" />

import { YAML } from './utils/yaml';
import { createIframe, modifyHTML, writeStyle } from './utils/modifyDOM';
import { setDebug, showMessage, log, showIframe } from './utils/gui';

const yaml = new YAML;
export const yamlify = yaml.yamlify.bind(yaml);

const documents: { [key: string]: IframeDoc } = {};
let ws: WebSocket, heartBeat: NodeJS.Timeout;

ws = new WebSocket('wss://' + location.host);
ws.addEventListener('open', wsInit);
ws.addEventListener('error', () => {
  ws = new WebSocket('ws://' + location.host);
  ws.addEventListener('open', wsInit);
  console.log('WSS unavailable.');
});

function wsInit() {
  ws.events = {}, ws.on = (event, handler) => ws.events[event] = handler;
  ws.addEventListener('message', ({ data: msg }) => {
    const { task, data } = JSON.parse(msg);
    ws.events[task] && ws.events[task](data);
  });
  ws.send('connect');
  document.querySelector('#initMessage')!.textContent = (
    'Connection established. Open a .html/.pug file to begin.'
  );

  interface ModifiedAbsoluteFile { filePath: string, content: string };
  interface ModifiedRelativeFile { fileRel: string, content: string };

  ws.on('switchHTML', async ({ filePath, content }: ModifiedAbsoluteFile) => {
    const initMessage = document.querySelector('#initMessage');
    initMessage && document.body.removeChild(initMessage);
    showMessage(filePath, 'info', 'fade');
    documents[filePath] && showIframe(documents[filePath]);
    documents[filePath] ||= await createIframe(content);
  });

  ws.on('editHTML', ({ filePath, content }: ModifiedAbsoluteFile) => (
    modifyHTML(documents[filePath], content),
    showMessage(null, null, 'hide')
  ));

  ws.on('injectCSS', ({ fileRel, content }: ModifiedRelativeFile) => {
    for (const htmlPath in documents) {
      writeStyle(documents[htmlPath].head, fileRel, content)
    }
  });

  ws.on('reloadJS', async (fileRel: string) => {
    for (const htmlPath in documents) {
      const iframeDoc = documents[htmlPath];
      const scripts = [...iframeDoc.querySelectorAll('script')];
      const script = scripts.find(script => (
        script.src.startsWith(location.href) &&
        script.src.slice(location.href.length) === fileRel
      ));
      if (!script) continue;
      log('Reloading a document containing the saved script...', 'info');
      document.body.removeChild(iframeDoc.iframe);
      documents[htmlPath] = await createIframe(iframeDoc.oldHTML);
    }
  });

  ws.on('reloadFull', () => location.reload());

  ws.on('alive', ({debug}: { debug: boolean }) => (
    setDebug(debug),
    clearTimeout(heartBeat),
    heartBeat = setTimeout(() => (
      showMessage('Server disconnected.', 'warn', 'show')
    ), 500)
  ));

  ws.on('showError', ({ message }: { message: string }) => (
    showMessage(message, 'warn', 'show')
  ));
}