import { MIN_BOX_SIZE } from "..";

const messagePane = document.querySelector('#lively-pane') as MessagePane;
const messageCenter = document.querySelector('#lively-center') as HTMLElement;
const errorIcon = document.querySelector('#lively-error') as HTMLElement;
const warningIcon = document.querySelector('#lively-warning') as HTMLElement;
const minimizeIcon = document.querySelector('#lively-minimize') as HTMLElement;

let debug = false;

export function setDebug(debugEnabled: boolean) {
  debug = debugEnabled;
}

export function showMessage(data: string | MsgData[], type: MsgType = 'info') {
  let errors = 0, warnings = 0;
  messageCenter.textContent = '';
  typeof data === 'string' && (data = [{ msg: data, type }]);
  data.forEach(({ msg, type }) => {
    const div = document.createElement('div');
    div.classList.add('lively-message', 'graspable');
    type === 'error' && (++errors, div.classList.add('lively-error'));
    type === 'warn' && (++warnings, div.classList.add('lively-warning'));
    div.textContent = msg;
    messageCenter.appendChild(div);
  });
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
  const iframes = [...document.querySelectorAll('iframe')];
  const docIframe = iframeDoc.iframe;
  iframes.forEach(iframe => iframe !== docIframe && iframe.animate(
    { opacity: 0, zIndex: 0 },
    { duration: 500, fill: 'forwards' }
  ));
  docIframe.animate(
    { opacity: 1, zIndex: 1 },
    { duration: 500, fill: 'forwards' }
  );
}

errorIcon.addEventListener('click', () => {
  messagePane.classList.toggle('error-hidden');
});

warningIcon.addEventListener('click', () => {
  messagePane.classList.toggle('warning-hidden');
});

minimizeIcon.addEventListener('mousedown', () => {
  messagePane.holdTimer = setTimeout(
    () => document.body.removeChild(messagePane),
    800
  );
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
  this.animate(
    { transform: 'rotate(180deg)' },
    { duration: 100, fill: 'forwards' }
  );
});

export function maximizeMessagePane(width?: number, height?: number) {
  !height && ([width, height] = messagePane.originalSize!);
  messagePane.style.width = width + 'px';
  messagePane.style.height = height + 'px';
  messagePane.style.top = messagePane.offsetTop + MIN_BOX_SIZE - height + 'px';
  messagePane.originalSize = null;
  minimizeIcon.animate(
    { transform: 'rotate(0deg)' },
    { duration: 100, fill: 'forwards' }
  );
}