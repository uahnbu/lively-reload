import { join, parse } from 'path';
import { HtmlValidate } from 'html-validate';
import { RuleConfig } from 'html-validate/dist/config';
import { getConfig, getRoot } from '../../extension';

let htmlvalidate: HtmlValidate;

async function constructHtmlValidate() {
  if (htmlvalidate) return;
  const { HtmlValidate } = await import('html-validate');
  const html5 = await import('html-validate/elements/html5.json');
  const rules = await import('../assets/htmlRules.json') as RuleConfig;
  htmlvalidate = new HtmlValidate({ elements: [html5], rules });
}

export interface HtmlMessage {
  filePath: string
  messages: { msg: string, type: string }[]
}

export interface HtmlPack extends HtmlMessage {
  fileRel: string
  content: string
  highlightIds: (number | string)[]
}

export function packHtml(content: string, filePath: string): Promise<HtmlPack>
export function packHtml(
  content: string,
  filePath: string
): Promise<HtmlMessage>

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

  const root = getRoot();
  const isRelative = root && filePath.startsWith(root);
  const fileRel = isRelative ? filePath.slice(root!.length) : '';
  const { highlight } = await import('./highlightContent');
  let highlightIds: (number | string)[];
  ({ content, highlightIds } = highlight(content, 'html'));
  return { filePath, fileRel, content, messages, highlightIds };
}

export async function packPug(
  content : string,
  filePath: string,
  root   ?: string
) {
  // TODO: Chunk Webpack for Pug, Sass, Ts.
  const { render: renderPug } = await import('pug');
  const { pretty, maxLoop, outdir } = await getConfig('pugOptions');
  // Add loop limit to prevent infinite loop.
  content = content.replace(
    /^(\s*while.*)$/gm,
    '-var _sAfeVar=0;\n$1&&_sAfeVar++<' + maxLoop
  );
  content = renderPug(content, {pretty});
  if (root && outdir != null) {
    const fileName = parse(filePath).name + '.html';
    filePath = join(root, outdir, fileName);
  }
  return { filePath, content, messages: [] };
}

export async function packCss(content: string, filePath: string, root: string) {
  const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
  const { highlight } = await import('./highlightContent');
  const highlightIds = highlight(content, 'css');
  const selectors = [
    // Ignore quotes.
    '(".*?"|\'.*?\')',
    ';[\\n\\r\\s]*(})',
    // Remove spaces along with new lines.
    '\\s*[\\n\\r]+\\s*',
    // Remove spaces around operators.
    '\\s*([{}():,>~+])\\s*',
    // Keep spaces inside calc.
    '(calc\\(.*\\))',
    // Ignore comments.
    '(\\s*\\/\\*[\\s\\S]*?\\*\\/)',
  ];
  content = content.replace(RegExp(selectors.join('|'), 'gi'), '$1$2$3$4');
  return { fileRel, content, highlightIds };
}

export async function packScss(
  content : string,
  filePath: string,
  root   ?: string
) { return await packSass(content, filePath, root, false) }

export async function packSass(
  content : string,
  filePath: string,
  // Root is unnecessary when exporting.
  root   ?: string,
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
  if (outdir != null) {
    const fileName = parse(filePath).name + '.css';
    filePath = join(root, outdir, fileName);
  }
  const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
  return { fileRel, content };
}

export async function packTs(content: string, root: string, target: string) {
  const { transpile: renderTs } = await import('typescript');
  content = renderTs(content);
  const fileRel = target.slice(root.length + 1).replace(/\\/g, '/');
  return { fileRel, content };
}