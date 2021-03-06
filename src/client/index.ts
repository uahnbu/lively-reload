/// <reference path="index.d.ts" />

import { Interact } from './utils/interact';
import { YAML } from './utils/yaml';
import { createIframe, modifyHTML, writeStyle } from './utils/modifyDOM';
import {
  setDebug,
  showIframe,
  showMessage,
  log,
  maximizeMessagePane
} from './utils/modifyGUI';

export const MIN_BOX_SIZE = 144;

const messagePane = document.querySelector('#lively-pane') as MessagePane;
const interact = new Interact('interactive', 'graspable', MIN_BOX_SIZE);
document.addEventListener('mousedown', e => {
  const { state } = interact.mouseDown(e) || {};
  if (!state) return;
  messagePane.originalSize && maximizeMessagePane(MIN_BOX_SIZE, MIN_BOX_SIZE);
});
document.addEventListener('mouseup', interact.mouseUp.bind(interact));
document.addEventListener('mousemove', interact.mouseMove.bind(interact));

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

  ws.on('switchHTML', async ({ filePath, content, messages }: AbsoluteData) => {
    const initMessage = document.querySelector('#initMessage');
    initMessage && document.body.removeChild(initMessage);
    showMessage([{ msg: filePath, type: 'info' } as MsgData].concat(messages));
    documents[filePath] && showIframe(documents[filePath]);
    content != null && (documents[filePath] ||= await createIframe(content));
  });

  ws.on('editHTML', ({ filePath, content, messages }: AbsoluteData) => (
    showMessage(messages),
    content != null && modifyHTML(documents[filePath], content)
  ));

  ws.on('injectCSS', ({ fileRel, content }: RelativeData) => {
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
    heartBeat = setTimeout(
      () => showMessage('Server disconnected.', 'error'),
      500
    )
  ));

  ws.on('showMessage', (data: MsgData[]) => showMessage(data));
}