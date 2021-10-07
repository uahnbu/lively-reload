import { window } from 'vscode';

const voidTags = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
];

export function highlight(content: string, filetype: 'html'): HtmlHighlight
export function highlight(content: string, filetype: 'css'): string[]

export function highlight(content: string, filetype: 'html' | 'css') {
  const lines: {
    index : number, length: number,
    spaces: number, breaks: number
  }[] = [];
  const re = /(^|[\r\n]+)(\s*).*/g;
  let match: RegExpExecArray | null;
  while (true) {
    if (!(match = re.exec(content))) break;
    lines[lines.length] = {
      index : match.index,
      length: match[0].length,
      breaks: match[1].length,
      spaces: match[2].length
    };
  }

  const selections = window.activeTextEditor!.selections.map(sel => ({
    start: getIndex(sel.start.character, sel.start.line),
    end: getIndex(sel.end.character, sel.end.line)
  })) as ShiftedSelection[];

  if (filetype === 'html') {
    // Ingore pointers put among the starting spaces as they are unlikely to be
    // the user's intention to select the element.
    const usefulSelections = selections.filter(({ start, end }) => (
      !lines.some(({ index, spaces, breaks }) => {
        return start >= index + breaks && end <= index + breaks + spaces
      })
    ));
    return highlightHtml(content, usefulSelections);
  }
  if (filetype === 'css') {
    // If the user put a pointer among the starting spaces, it's considered
    // that they want to select the css selector.
    return highlightCss(content, selections);
  }

  // Turn 2-dimensional position to 1-dimensional index.
  function getIndex(x: number, y: number) {
    const fullLines = lines.slice(0, y);
    const fullLength = fullLines.reduce((len, line) => len + line.length, 0);
    return fullLength + lines[y].breaks + x;
  }
}

function highlightHtml(content: string, selections: ShiftedSelection[]) {
  const stack: TagNode[] = [], graph: TagNode[] = [], list: TagNode[] = [];
  // Replace strings, which may include opening/closing tags.
  const dummy = content.replace(/('|")[\s\S]*?\1/g, x => 'x'.repeat(x.length));
  // Match opening/closing tags.
  const re = /<\/?[a-z-]+[\s\S]*?>/gi;
  while (true) {
    const match = re.exec(dummy);
    if (!match) break;
    if (match[0].startsWith('</')) {
      const tag = stack.pop() as TagNode;
      tag.rightStart = match.index;
      tag.rightEnd = match.index + match[0].length;
      if (!stack.length) graph[graph.length] = tag;
      else stack[stack.length - 1].children.push(tag);
      continue;
    }
    if (voidTags.some(tag => match[0].startsWith('<' + tag))) {
      const tag = { children: [] } as unknown as TagNode;
      tag.leftStart = tag.rightStart = match.index;
      tag.leftEnd = tag.rightEnd = match.index + match[0].length;
      if (!stack.length) graph[graph.length] = tag;
      else stack[stack.length - 1].children.push(tag);
      list[list.length] = tag;
      continue;
    }
    // If tag is an opening tag, add tag to the stack.
    list[list.length] = stack[stack.length] = {
      leftStart: match.index,
      leftEnd: match.index + match[0].length,
      rightStart: -1, rightEnd: -1, children: []
    };
  }

  const highlightIds: (number | string)[] = [];
  selections.forEach(({ start, end }) => {
    graph.forEach(node => addHighlights(node, start, end));
  });
  // Add the id attribute to the elements from bottom to top to avoid shifting
  // the elements' insert index.
  list.reverse().forEach(({ leftEnd }) => {
    const attribute = ' lively-position=' + leftEnd;
    const pos = leftEnd - 1;
    content = content.slice(0, pos) + attribute + content.slice(pos);
  });
  return { content, highlightIds };

  function addHighlights(node: TagNode, start: number, end: number): boolean {
    const { leftStart, leftEnd, rightStart, rightEnd, children } = node;
    if (start >= rightEnd || end <= leftStart) return false;
    if (/^<style/i.test(content.slice(leftStart, leftEnd))) {
      const innerContent = content.slice(leftEnd, rightStart);
      const selections = [{ start: start - leftEnd, end: end - leftEnd }];
      highlightIds.push(...highlightCss(innerContent, selections));
      return true;
    }
    if (
      // If the selection is inside the tag, highlight the element regardless of
      // the element's child nodes.
      start < leftEnd && end > leftStart ||
      start < rightEnd && end > rightStart ||
      // The pointer is completely inside the element's content, i.e. innerHTML,
      // and there's no child that covers the selection.
      !children?.map(node => addHighlights(node, start, end)).some(Boolean)
    ) highlightIds[highlightIds.length] = leftEnd;
    // At least one child node intersects with the selection, in which case true
    // is returned as well.
    return true;
  }
}

function highlightCss(content: string, selections: ShiftedSelection[]) {
  const re = /(\/\*.*?\*\/|@[a-z-]+[\s\w]*{.*?})|([^%{}]+){[^{]*?}/gi;
  const highlightIds: string[] = [];
  while (true) {
    const match = re.exec(content);
    if (!match) break;
    const [s, s1, s2] = match;
    // Ignore reserved keyword, e.g. @font-face, @keyframes and comments.
    if (s1) continue;
    const { index: i } = match;
    if (selections.some(({ start, end }) => start < i + s.length && end > i)) {
      highlightIds[highlightIds.length] = s2.trim();
    }
  }
  return highlightIds;
}