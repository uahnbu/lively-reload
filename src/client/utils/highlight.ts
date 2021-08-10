import { isDebugging, log } from "./modifyGUI";

const highlightArea = document.querySelector<HTMLElement>('#highlight-area')!;

const styleProperties = [
  'border-radius', 'border-top-width',
  'border-right-width', 'border-bottom-width', 'border-left-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
];

let selections: Map<HTMLElement, Highlight> = new Map;

export function highlightHtml(iframeDoc: IframeDoc, ids?: (number | string)[]) {
  if (!ids) {
    selections.forEach(highlight => {
      const styles = getHighlightStyles(highlight.target!);
      rehighlight(highlight, styles);
    });
    return;
  }
  const newSelections: Map<HTMLElement, Highlight> = new Map;
  const sel = ids.map(id => getIdAttribute(id)).join()
  const highlights = (
    (sel.length ? [...iframeDoc.querySelectorAll<HTMLElement>(sel)] : [])
    .filter(el => iframeDoc.body.contains(el))
  );
  let hasScrolled = false;
  log(highlights, 'Highlighting the following selectors: ' + sel);
  highlights.forEach(target => {
    const styles = getHighlightStyles(target);
    if (selections.has(target)) {
      const highlight = selections.get(target)!;
      rehighlight(highlight, styles);
      selections.delete(target);
      newSelections.set(target, highlight);
      return;
    }
    const { highlightStyles, horizontalStyles, verticalStyles } = styles;
    const highlight = addHighlightPart(highlightArea, '', highlightStyles);
    addHighlightPart(highlight, '-horizontal', horizontalStyles);
    addHighlightPart(highlight, '-vertical', verticalStyles);
    newSelections.set(target, highlight);
    highlight.target = target;
    !hasScrolled && (hasScrolled = scrollToView(target, highlightStyles));
  });
  selections.forEach(highlight => {
    delete highlight.target;
    highlightArea.removeChild(highlight);
  });
  selections.clear();
  selections = newSelections;
  !hasScrolled && Scroller.highlight();
}

export function highlightCss(ids: string[], fileRel: string) {
  const sel = 'iframe[showing=true]';
  const iframe = document.querySelector<HTMLIFrameElement>(sel);
  if (!iframe) return;
  const iframeDoc = iframe.contentDocument as IframeDoc;

  const links = [...iframeDoc.querySelectorAll('link')];
  if (links.some(link => (
    link.href.startsWith(location.href) &&
    link.href.slice(location.href.length) === fileRel
  ))) { highlightHtml(iframeDoc, ids); return }

  const style = iframeDoc.querySelector('#' + generateStyleId(fileRel));
  style && highlightHtml(iframeDoc, ids);

  function generateStyleId(url: string) {
    const encodedUrl = btoa(encodeURIComponent(url)).replace(/[+/=]/g, '_');
    return 'lively-style-' + encodedUrl;
  }
}

function getIdAttribute(id: number | string) {
  if (typeof id === 'string') return id;
  return '[lively-position="' + id + '"]';
}

function getHighlightStyles(target: HTMLElement) {
  const { width, height, left, top } = target.getBoundingClientRect();
  const computedStyle = window.getComputedStyle(target);
  const attributes: K = {};
  styleProperties.forEach(attr => {
    attributes[attr] = +computedStyle.getPropertyValue(attr).slice(0, -2);
  });
  const {
    'border-radius'    : r,
    'border-top-width' : bt, 'border-bottom-width': bb,
    'border-left-width': bl, 'border-right-width' : br,
    'padding-top' : pt, 'padding-bottom': pb,
    'padding-left': pl, 'padding-right' : pr,
    'margin-top'  : mt, 'margin-bottom' : mb,
    'margin-left' : ml, 'margin-right'  : mr
  } = attributes;
  return {
    highlightStyles: {
      width: width + ml + mr, height: height + mt + mb,
      left: left - ml, top: top - mt, borderRadius: r
    },
    horizontalStyles: {
      height: height - bt - bb - pt - pb + 2,
      top: mt + pt + bt - 1
    },
    verticalStyles: {
      width: width - bl - br - pl - pr + 2,
      left: ml + pl + bl - 1
    }
  };
}

function rehighlight(highlight: Highlight, styles: K) {
  const horizontalSel = '.highlight-horizontal';
  const verticalSel = '.highlight-vertical';
  const horizontal = highlight.querySelector<HTMLElement>(horizontalSel)!;
  const vertical = highlight.querySelector<HTMLElement>(verticalSel)!;
  const { highlightStyles, horizontalStyles, verticalStyles } = styles;
  setHighlightPart(highlight, highlightStyles);
  setHighlightPart(horizontal, horizontalStyles);
  setHighlightPart(vertical, verticalStyles);
}

function setHighlightPart(el: HTMLElement, styles: K) {
  const style = el.style as K;
  for (const attr in styles) { style[attr] = styles[attr] + 'px' }
}

function addHighlightPart(el: HTMLElement, suffix: HighlightPart, styles: K) {
  const div = document.createElement('div') as Highlight;
  div.classList.add('highlight' + suffix);
  setHighlightPart(div, styles);
  el.appendChild(div);
  return div;
}

function scrollToView(el: HTMLElement, bound: Bound): boolean {
  if (isDebugging()) {
    const outerHTML = el.outerHTML;
    const content = outerHTML.slice(0, outerHTML.length - el.innerHTML.length);
    const dummy = content.replace(/'.*?'|".*?"/g, x => 'x'.repeat(x.length));
    const elementTag = content.slice(0, 1 + dummy.indexOf('>'));
    log(`Focusing on HTML element ${elementTag}...`, 'info');
  }
  const { width, height, left, top } = bound;
  const parent = el.parentElement!;
  const isMainParent = parent.tagName.toUpperCase() === 'BODY';
  const styles = window.getComputedStyle(parent);
  const scrollX = styles.getPropertyValue('overflow-x');
  const scrollY = styles.getPropertyValue('overflow-y');
  const isScrollable = (
    scrollX === 'auto' || scrollX === 'scroll' ||
    scrollY === 'auto' || scrollY === 'scroll' ||
    isMainParent && scrollX !== 'hidden' && scrollY !== 'hidden'
  );
  if (!isScrollable) { return !isMainParent && scrollToView(parent, bound) }
  let vx = 0, vy = 0, vw, vh;
  if (isMainParent) {
    ({ innerWidth: vw, innerHeight: vh } = window);
  } else {
    const { width, height, top, left } = parent.getBoundingClientRect();
    scrollToView(parent, { width, height, top, left });
    [vx, vy, vw, vh] = [left, top, width, height];
  }
  const dx = left - vx, dy = top - vy;
  if (width > vw) {
    dx > 0 && Scroller.setTargetX(parent, dx);
    dx + width < vw && Scroller.setTargetX(parent, dx + width - vw);
  } else Scroller.setTargetX(parent, dx + width / 2 - vw / 2);
  if (height > vh) {
    dy > 0 && Scroller.setTargetY(parent, dy);
    dy + height < vh && Scroller.setTargetY(parent, dy + height - vh);
  } else Scroller.setTargetY(parent, dy + height / 2 - vh / 2);
  return true;
}

class Scroller {
  EPSILON = 1e-1
  maxSpeed = 50
  awareDist = 100
  ratio = this.maxSpeed / this.awareDist
  element: HTMLElement | null
  targetX = 0
  targetY = 0
  constructor(element: HTMLElement) { this.element = element }
  callback() {
    Scroller.scrollers.delete(this.element!);
    this.element = null;
    Scroller.highlight();
  }
  setTarget(targetPos: number, axis: 'x' | 'y') {
    axis === 'x' && (this.targetX = targetPos);
    axis === 'y' && (this.targetY = targetPos);
    this.scroll();
  }
  scroll() {
    if (!this.isScrolling()) { this.callback(); return }
    const { EPSILON, awareDist, ratio, element, targetX, targetY } = this;
    const { abs, min, sign } = Math;
    if (abs(targetX) > EPSILON) {
      const delta = sign(targetX) * min(awareDist, abs(targetX)) * ratio;
      element!.scrollLeft += delta, this.targetX -= delta;
    }
    if (abs(targetY) > EPSILON) {
      const delta = sign(targetY) * min(awareDist, abs(targetY)) * ratio;
      element!.scrollTop += delta, this.targetY -= delta;
    }
    requestAnimationFrame(this.scroll.bind(this));
  }
  isScrolling() {
    const { EPSILON, targetX, targetY } = this, abs = Math.abs;
    return abs(targetX) > EPSILON || abs(targetY) > EPSILON;
  }

  static scrollers: Map<HTMLElement, Scroller> = new Map
  static setTargetX(element: HTMLElement, targetPos: number) {
    this.setTarget(element, targetPos, 'x');
  }
  static setTargetY(element: HTMLElement, targetPos: number) {
    this.setTarget(element, targetPos, 'y');
  }
  static setTarget(element: HTMLElement, targetPos: number, axis: 'x' | 'y') {
    let scroller = this.scrollers.get(element);
    !scroller && this.scrollers.set(element, scroller = new this(element));
    scroller.setTarget(targetPos, axis);
  }
  static highlight() {
    if (this.scrollers.size !== 0) return;
    selections.forEach(el => el.classList.add('appear'));
  }
}