import { window } from 'vscode';

interface HtmlHighlight {
  content: string
  highlightIds: (number | string)[]
}

interface TagNode {
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
  children: TagNode[]
}

interface Selection {
  start: number
  end: number
}

const voidTags = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
];

export function highlight(content: string, filetype: 'html'): HtmlHighlight
export function highlight(content: string, filetype: 'css'): string[]

export function highlight(content: string, filetype: 'html' | 'css') {
  const lines = content.split(/\r?\n/);
  const spaces: any[] = [];
  let breakCount = 0;
  content = content.replace(/(^|[\n\r]+)\s*/g, (match, breaks, i) => {
    const index = i - breakCount;
    const len = match.length - breaks.length;
    spaces[spaces.length] = { index, len };
    breakCount += breaks.length;
    return '';
  });

  const selections = window.activeTextEditor!.selections.map(sel => ({
    start: getIndex(sel.start.character, sel.start.line),
    end: getIndex(sel.end.character, sel.end.line)
  })) as Selection[];
  if (filetype === 'html') {
    const usefulSelections = selections.filter(({ start, end }) => (
      !spaces.some(({ index, len }) => start >= index && end <= index + len)
    ));
    usefulSelections.forEach(sel => {
      sel.start -= countPrevSpaces(sel.start);
      sel.end -= countPrevSpaces(sel.end);
    });
    return highlightHtml(content, usefulSelections);
  }
  if (filetype === 'css') {
    selections.forEach(sel => {
      sel.start -= countPrevSpaces(sel.start);
      sel.end -= countPrevSpaces(sel.end);
    });
    return highlightCss(content, selections);
  }

  function getIndex(x: number, y: number) {
    return lines.slice(0, y).reduce((len, line) => len + line.length, 0) + x;
  }

  function countPrevSpaces(pivot: number) {
    return spaces.reduce((total, { index, len }) => {
      if (index > pivot) return total;
      if (index + len > pivot) return total + pivot - index;
      return total + len;
    }, 0);
  }
}

function highlightHtml(content: string, selections: Selection[]) {
  const stack: TagNode[] = [], graph: TagNode[] = [], list: TagNode[] = [];
  const dummy = content.replace(/'.*?'|".*?"/g, x => 'x'.repeat(x.length));
  const re = /<\/?[a-z-]+.*?>/gi;
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
  list.reverse().forEach(({ leftEnd }) => {
    const attribute = ' lively-position=' + leftEnd;
    const pos = leftEnd - 1;
    content = content.slice(0, pos) + attribute + content.slice(pos);
  });
  return { content, highlightIds };

  function addHighlights(node: TagNode, start: number, end: number): boolean {
    const { leftStart, leftEnd, rightStart, rightEnd, children } = node;
    if (start >= rightEnd || end <= leftStart) return false;
    if (
      start < leftEnd && end > leftStart ||
      start < rightEnd && end > rightStart ||
      !children?.map(node => addHighlights(node, start, end)).some(Boolean)
    ) { highlightIds[highlightIds.length] = leftEnd }
    return true;
  }
}

function highlightCss(content: string, selections: Selection[]) {
  const re = /(@[a-z-]+[\s\w]*{.*?})|([^%{}]+){[^{]*?}/gi;
  const highlightIds: string[] = [];
  while (true) {
    const match = re.exec(content);
    if (!match) break;
    const [s, s1, s2] = match, { index: i } = match;
    if (s1) continue;
    if (selections.some(({ start, end }) => start < i + s.length && end > i)) {
      highlightIds[highlightIds.length] = s2.trim();
    }
  }
  return highlightIds;
}