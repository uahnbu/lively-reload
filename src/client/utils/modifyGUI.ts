import { MIN_BOX_SIZE } from '..';

const messagePane = document.querySelector<MessagePane>('#lively-pane')!;
const messageCenter = document.querySelector<HTMLElement>('#lively-center')!;
const errorIcon = document.querySelector<HTMLElement>('#lively-error')!;
const warningIcon = document.querySelector<HTMLElement>('#lively-warning')!;
const minimizeIcon = document.querySelector<HTMLElement>('#lively-minimize')!;

let debug = true;

export function setDebug(debugEnabled: boolean) { debug = debugEnabled }
export function isDebugging() { return debug }

export function showMessage(data: string | MsgData[], type: MsgType = 'info') {
  let errors = 0, warnings = 0;
  messageCenter.textContent = '';
  typeof data === 'string' && (data = [{ msg: data, type }]);
  if (data.length === 0) {
    messagePane.hidden = true;
    errorIcon.dataset.indicator = warningIcon.dataset.indicator = '0';
    return;
  }
  data.forEach(({ msg, type }) => {
    const div = document.createElement('div');
    div.classList.add('lively-message', 'graspable');
    type === 'error' && (++errors, div.classList.add('lively-error'));
    type === 'warn' && (++warnings, div.classList.add('lively-warning'));
    div.textContent = msg;
    messageCenter.appendChild(div);
  });
  messagePane.hidden = false;
  errorIcon.dataset.indicator = '' + errors;
  warningIcon.dataset.indicator = '' + warnings;
}

export function log(msg: string | any[], type: string) {
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

export function showIframe(iframeDoc: IframeDoc) {
  const iframes = document.querySelectorAll('iframe');
  const docIframe = iframeDoc.iframe;
  iframes.forEach(iframe => iframe.setAttribute('showing', 'false'));
  docIframe.setAttribute('showing', 'true');
}

export function maximizeMessagePane(width?: number, height?: number) {
  !height && ([width, height] = messagePane.originalSize!);
  messagePane.style.width = width + 'px';
  messagePane.style.height = height + 'px';
  messagePane.style.top = messagePane.offsetTop + MIN_BOX_SIZE - height + 'px';
  messagePane.originalSize = null;
}

minimizeIcon.addEventListener('mousedown', () => {
  messagePane.holdTimer = setTimeout(removeMsgPane, 500);
  function removeMsgPane() { document.body.removeChild(messagePane) }
});
minimizeIcon.addEventListener('mouseup', () => {
  clearTimeout(messagePane.holdTimer);
});

minimizeIcon.addEventListener('click', function() {
  if (messagePane.originalSize) { maximizeMessagePane(); return }
  const { offsetWidth, offsetHeight, offsetTop } = messagePane;
  messagePane.style.width = messagePane.style.height = MIN_BOX_SIZE + 'px';
  messagePane.style.top = offsetTop + offsetHeight - MIN_BOX_SIZE + 'px';
  messagePane.originalSize = [offsetWidth, offsetHeight];
});