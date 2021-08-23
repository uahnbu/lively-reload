/// <reference path="index.d.ts" />

import { Interact } from './utils/interact';
import { YAML } from './utils/yaml';
import { createIframe, modifyHTML, writeStyle } from './utils/modifyDOM';
import {
  setDebug, log, addShowingAttribute,
  showMessage, maximizeMessagePane,
} from './utils/modifyGUI';
import { highlightHtml, highlightCss } from './utils/highlight';

export const MIN_BOX_SIZE = 144;

const messagePane = document.querySelector<MessagePane>('#lively-pane')!;
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

// If the server is opened in a secured connection, e.g. through ngrok tunnel,
// construct a secure WebSocket, else fallback to a normal WebSocket.
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
  sendMessage('connect');
  const msg = 'Connection established. Open a .html/.pug file to begin.';
  document.querySelector('#init-message')!.textContent = msg;

  ws.on('switchHTML', async (data: AbsoluteData) => {
    const { filePath, fileRel, content, messages, highlightIds } = data;
    const initMessage = document.querySelector('#init-message');
    initMessage && document.body.removeChild(initMessage);
    showMessage([{ msg: filePath, type: 'info' } as MsgData].concat(messages));
    documents[filePath] && addShowingAttribute(documents[filePath]);
    if (content != null) {
      const iframeDoc = await createIframe(content, filePath, fileRel);
      documents[filePath] = iframeDoc;
    }
    highlightHtml(documents[filePath], highlightIds);
  });

  ws.on('editHTML', (data: AbsoluteData) => {
    const { filePath, content, messages, highlightIds } = data;
    showMessage(messages);
    content != null && (
      modifyHTML(documents[filePath], content),
      highlightHtml(documents[filePath], highlightIds)
    );
  });

  ws.on('highlightHtml', ({ highlightIds, filePath }: HighlightData) => {
    const iframeDoc = documents[filePath!];
    highlightHtml(iframeDoc, highlightIds);
  });

  ws.on('highlightCss', ({ highlightIds, fileRel }: HighlightData) => {
    highlightCss(highlightIds as string[], fileRel!);
  });

  ws.on('injectCSS', ({ content, fileRel }: RelativeData) => {
    for (const htmlPath in documents) {
      writeStyle(documents[htmlPath].head, content, fileRel);
    }
  });

  // Reload all iframe containing the editted script.
  ws.on('reloadJS', async (fileRel: string) => {
    for (const htmlPath in documents) {
      const iframeDoc = documents[htmlPath];
      const scripts = [...iframeDoc.querySelectorAll('script')];
      const script = scripts.find(({src}) => src === location.href + fileRel);
      if (!script) continue;
      log(`Reloading file ${htmlPath} due to a changed script...`, 'info');
      document.body.removeChild(iframeDoc.iframe);
      const { oldHTML, fileRel: oldFileRel } = iframeDoc;
      documents[htmlPath] = await createIframe(oldHTML, htmlPath, oldFileRel);
    }
  });

  // Fully reload the page and flush all inactive iframes.
  ws.on('reloadFull', () => location.reload());

  ws.on('alive', ({debug}: { debug: boolean }) => {
    setDebug(debug);
    clearTimeout(heartBeat);
    heartBeat = setTimeout(informDisconnection, 1000);
    function informDisconnection() {
      showMessage('Server disconnected.', 'error');
    }
  });

  ws.on('showMessage', (data: MsgData[]) => showMessage(data));
}

export function sendMessage(task: string, data: any = null) {
  ws.send(JSON.stringify({ task, data }));
}

document.addEventListener('resize', () => {
  const sel = 'iframe[showing=true]';
  const iframe = document.querySelector<HTMLIFrameElement>(sel)!;
  highlightHtml(iframe.contentDocument as IframeDoc);
});