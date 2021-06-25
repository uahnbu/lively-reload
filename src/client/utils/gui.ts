const fileMessage = document.querySelector('#fileMessage') as HTMLElement;

const animSet = {
  show: [0, 1],
  hide: [0],
  fade: [0].concat(Array(9).fill(1), 0),
  blink: [1, 0, 1],
};

let debug = false;

export function setDebug(debugEnabled: boolean) {
  debug = debugEnabled;
}

type Anim = 'show' | 'hide' | 'fade' | 'blink';
type MsgType = 'info' | 'warn' | null;
export function showMessage(msg: string | null, type: MsgType, anim: Anim) {
  msg && (
    fileMessage.innerHTML = msg,
    fileMessage.classList.remove('info', 'warn'),
    fileMessage.classList.add(type!)
  );
  fileMessage.animate(
    animSet[anim].map(val => ({ opacity: val, zIndex: val * 99 })),
    { duration: (animSet[anim].length - 1) * 200, fill: 'forwards' }
  );
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