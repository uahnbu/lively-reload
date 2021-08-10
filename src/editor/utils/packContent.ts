import { join, parse } from 'path';
import { HtmlValidate } from 'html-validate';
import { RuleConfig } from 'html-validate/dist/config';
import { getConfig } from '../../extension';

let htmlvalidate: HtmlValidate;

async function constructHtmlValidate() {
  if (htmlvalidate) return;
  const { HtmlValidate } = await import('html-validate');
  const html5 = await import('html-validate/elements/html5.json');
  const rules = await import('../assets/htmlRules.json') as RuleConfig;
  htmlvalidate = new HtmlValidate({ elements: [html5], rules });
}

export function packHtml(content: string, filePath: string): Promise<{
  filePath: string
  messages: { msg: string, type: string }[]
  content?: string
  highlightIds?: (number | string)[]
}>

export async function packHtml(content: string, filePath: string) {
  await constructHtmlValidate();
  const report = htmlvalidate.validateString(content);
  const messages = report.results?.[0]?.messages?.map(data => {
    const { message, line, column, severity } = data;
    const directiveMsg = `${line}:${column} ${message}`;
    const msgType = ['', 'warn', 'error'][severity];
    return { msg: directiveMsg, type: msgType };
  }) || [];
  if (!report.valid) return { filePath, messages };

  const { highlight } = await import('./highlightContent');
  let highlightIds: (number | string)[];
  ({ content, highlightIds } = highlight(content, 'html'));
  return { filePath, content, messages, highlightIds };
}

export async function packPug(
  content: string,
  filePath: string,
  root?: string
) {
  const { render: renderPug } = await import('pug');
  const { pretty, maxLoop, outdir } = await getConfig('pugOptions');
  content = content.replace(
    /^(\s*while.*)$/gm,
    '-var _sAfeVar=0;\n$1&&_sAfeVar++<' + maxLoop
  );
  content = renderPug(content, {pretty});
  if (!root) return { filePath, content, messages: [] };
  const dist = outdir ? join(root, outdir) : root;
  content = content.replace(/(?<=(href|src)=").+?(?=")/gi, linkRel => {
    const linkPath = linkRel.includes(':') ? linkRel : join(dist, linkRel);
    if (!linkPath.startsWith(root)) return linkRel;
    return linkPath.slice(root.length + 1).replace(/\\/g, '/');
  });
  outdir != null && (
    filePath = join(root, outdir, parse(filePath).name + '.html')
  );
  return { filePath, content, messages: [] };
}

export async function packCss(content: string, filePath: string, root: string) {
  const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
  const selectors = [
    '(".*?"|\'.*?\')',
    ';[\\n\\r\\s]*(})',
    '\\s*[\\n\\r]+\\s*',
    '\\s*([{}():,>~+])\\s*',
    '(calc\\(.*\\))',
    '(\\s*\\/\\*[\\s\\S]*?\\*\\/)',
  ];
  const { highlight } = await import('./highlightContent');
  const highlightIds = highlight(content, 'css');
  content = content.replace(RegExp(selectors.join('|'), 'gi'), '$1$2$3$4');
  return { fileRel, content, highlightIds };
}

export async function packScss(
  content: string,
  filePath: string,
  root?: string
) { return await packSass(content, filePath, root, false) }

export async function packSass(
  content: string,
  filePath: string,
  root?: string,
  indentedSyntax = true
) {
  const { renderSync: renderSass } = await import('sass');
  const { pretty, outdir } = await getConfig('sassOptions');
  content = renderSass({
    data: content,
    indentedSyntax,
    ...(!root && outdir && pretty ? {} : { outputStyle: 'compressed' })
  }).css.toString();
  if (!root) return content;
  outdir != null && (
    filePath = join(root, outdir, parse(filePath).name + '.css')
  );
  const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
  return { fileRel, content };
}

export async function packJs(content: string, root: string, target: string) {
  const { transpile: renderTs } = await import('typescript');
  content = renderTs(content);
  const fileRel = target.slice(root.length + 1).replace(/\\/g, '/');
  return { fileRel, content };
}