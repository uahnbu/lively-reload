const highlightArea = document.querySelector<HTMLElement>('#highlight-area')!;

const styleProperties = [
  'border-radius', 'border-top-width',
  'border-right-width', 'border-bottom-width', 'border-left-width',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
];

let selections: Map<HTMLElement, Highlight> = new Map;

export function highlightHtml(iframeDoc: IframeDoc, ids?: (number | string)[]) {
  const attribute = '[lively-position="';
  const sel = ids
    ? ids.map(id => typeof id === 'string' ? id : attribute + id + '"]').join()
    : '[lively-highlight]';
  const highlights = sel.length
    ? [...iframeDoc.querySelectorAll<HTMLElement>(sel)]
    : [];
  const newSelections: Map<HTMLElement, Highlight> = new Map;

  highlights.forEach(target => {
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

    const highlight = addHighlightPart(highlightArea, '', {
      width: width + ml + mr, height: height + mt + mb,
      left: left - ml, top: top - mt, borderRadius: r
    });
    highlight.target = target;
    addHighlightPart(highlight, '-horizontal', {
      height: height - bt - bb - pt - pb + 2,
      top: mt + pt + bt - 1
    });
    addHighlightPart(highlight, '-vertical', {
      width: width - bl - br - pl - pr + 2,
      left: ml + pl + bl - 1
    });

    if (selections.has(target)) {
      const highlight = selections.get(target)!;
      delete highlight.target;
      highlightArea.removeChild(highlight);
      selections.delete(target);
    } else {
      target.setAttribute('lively-highlight', '');
      scrollToView(target, {
        width: width + ml + mr, height: height + mt + mb,
        left: left - ml, top: top - mt
      });
    }
    newSelections.set(target, highlight);
  });

  selections.forEach(highlight => {
    highlight.target?.removeAttribute('lively-highlight');
    highlightArea.removeChild(highlight);
  });
  selections.clear();
  selections = newSelections;

  function addHighlightPart(el: HTMLElement, suffix: HighlightPart, styles: K) {
    const div = document.createElement('div') as Highlight;
    div.classList.add('highlight' + suffix);
    for (const attr in styles) {
      (div.style as K)[attr] = styles[attr] + 'px';
    }
    el.appendChild(div);
    return div;
  }

  function scrollToView(el: HTMLElement, bound: Bound) {
    if (!ids) return;
    const { width, height, left, top } = bound;
    const parent = el.parentElement!;
    const isMainParent = parent.tagName.toUpperCase() === 'BODY';
    const styles = iframeDoc.defaultView!.getComputedStyle(parent);
    const scrollX = styles.getPropertyValue('overflow-x');
    const scrollY = styles.getPropertyValue('overflow-y');
    const isScrollable = (
      scrollX === 'auto' || scrollX === 'scroll' ||
      scrollY === 'auto' || scrollY === 'scroll' ||
      isMainParent && scrollX !== 'hidden' && scrollY !== 'hidden'
    );
    let vx, vy, vw, vh;
    if (isMainParent) {
      vx = vy = 0;
      ({ innerWidth: vw, innerHeight: vh } = iframeDoc.defaultView!);
    } else {
      const { width, height, top, left } = parent.getBoundingClientRect();
      if (!isScrollable) scrollToView(parent, bound);
      else scrollToView(parent, { width, height, top, left });
      [vx, vy, vw, vh] = [left, top, width, height];
    }
    if (!isScrollable) return;
    const dx = left - vx, dy = top - vy;
    if (width > vw) {
      dx > 0 && Scroller.setTargetX(parent, dx);
      dx + width < vw && Scroller.setTargetX(parent, dx + width - vw);
    } else Scroller.setTargetX(parent, dx + width / 2 - vw / 2);
    if (height > vh) {
      dy > 0 && Scroller.setTargetY(parent, dy);
      dy + height < vh && Scroller.setTargetY(parent, dy + height - vh);
    } else Scroller.setTargetY(parent, dy + height / 2 - vh / 2);
  }
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