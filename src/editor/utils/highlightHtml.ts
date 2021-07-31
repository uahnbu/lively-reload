import { window } from 'vscode';

interface TagStack {
  leftStart: number
  leftEnd: number
  rightStart: number
  rightEnd: number
  children: TagStack[]
}

const voidTags = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
];

export function highlightHtml(content: string) {
  const selections = window.activeTextEditor!.selections;
  const lines = content.split(/\r?\n/);
  const stack: TagStack[] = [];
  const graph: TagStack[] = [];
  const re = /<\/?[a-z-]+.*?>/gi;
  let dummy = content = lines.join('');
  dummy = dummy.replace(/'.*?'|".*?"/g, x => 'x'.repeat(x.length));

  while (true) {
    const match = re.exec(dummy);
    if (!match) break;
    if (match[0].startsWith('</')) {
      const tag = stack.pop() as TagStack;
      tag.rightStart = match.index;
      tag.rightEnd = match.index + match[0].length;
      if (!stack.length) graph[graph.length] = tag;
      else stack[stack.length - 1].children.push(tag);
      continue;
    }
    if (voidTags.some(tag => match[0].startsWith('<' + tag))) continue;
    stack[stack.length] = {
      leftStart: match.index,
      leftEnd: match.index + match[0].length,
      rightStart: -1, rightEnd: -1, children: []
    };
  }

  const highlights: Set<number> = new Set;
  const attribute = ' lively-highlight=true';
  selections.forEach(({ start: ptrStart, end: ptrEnd }) => {
    const selStart = getIndex(ptrStart.character, ptrStart.line);
    const selEnd = getIndex(ptrEnd.character, ptrEnd.line);
    graph.forEach(node => addHighlights(node, selStart, selEnd));
  });
  [...highlights].sort((a, b) => b - a).forEach(index => {
    content = content.slice(0, index) + attribute + content.slice(index);
  });

  return content;

  function getIndex(x: number, y: number) {
    return lines.slice(0, y).reduce((len, line) => len + line.length, 0) + x;
  }

  function addHighlights(node: TagStack, start: number, end: number): boolean {
    const { leftStart, leftEnd, rightStart, rightEnd, children } = node;
    if (start >= rightEnd || end <= leftStart) return false;
    if (
      start < leftEnd && end > leftStart ||
      start < rightEnd && end > rightStart ||
      !children.length
    ) {
      const tagStart = content.slice(leftStart, leftEnd);
      highlights.add(leftStart + tagStart.match(/<[a-z-]+/i)![0].length);
    }
    return children.map(node => addHighlights(node, start, end)).some(Boolean);
  }
}