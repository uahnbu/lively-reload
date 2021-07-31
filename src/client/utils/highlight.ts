const highlightArea = document.querySelector<HTMLElement>('#highlight-area')!;

const styleProperties = [
  'border-width', 'border-radius',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left'
];

export function highlight(iframeDoc: IframeDoc) {
  const sel = '[lively-highlight=true]';
  const highlights = [...iframeDoc.querySelectorAll<HTMLElement>(sel)];
  const selections: Map<HTMLElement, HTMLElement[]> = new Map;

  highlights.forEach(target => {
    if (iframeDoc.selections.has(target)) {
      selections.set(target, iframeDoc.selections.get(target)!);
      iframeDoc.selections.delete(target);
      return;
    }
    const components: HTMLElement[] = [];
    const { width, height, left, top } = target.getBoundingClientRect();
    const computedStyle = getComputedStyle(target);
    const attributes: K = {};
    styleProperties.forEach(attr => {
      attributes[attr] = +computedStyle.getPropertyValue(attr).slice(0, -2);
    });
    const {
      'border-width': bw, 'border-radius' : br,
      'padding-top' : pt, 'padding-bottom': pb,
      'padding-left': pl, 'padding-right' : pr,
      'margin-top'  : mt, 'margin-bottom' : mb,
      'margin-left' : ml, 'margin-right'  : mr
    } = attributes;

    
    components[components.length] = addHighlightComponent('margin', {
      width: width + ml + mr, height: height + mt + mb,
      left: left - ml, top: top - mt, borderRadius: br
    });
    components[components.length] = addHighlightComponent('padding', {
      width: width - 2 * bw, height: height - 2 * bw,
      left, top, borderWidth: bw, borderRadius: br
    });
    components[components.length] = addHighlightComponent('content', {
      width: width - 2 * bw - pl - pr, height: height - 2 * bw - pt - pb,
      left: left + bw + pl, top: top + bw + pt, borderRadius: br
    });
    selections.set(target, components);
  });

  iframeDoc.selections.forEach(components => {
    components.forEach(el => highlightArea.removeChild(el));
  });
  iframeDoc.selections.clear();
  iframeDoc.selections = selections;

  function addHighlightComponent(componentType: HighlightType, divStyles: K) {
    const div = document.createElement('div');
    div.classList.add('highlight-' + componentType);
    for (const attr in divStyles) {
      (div.style as K)[attr] = divStyles[attr] + 'px';
    }
    highlightArea.appendChild(div);
    return div;
  }
}