import { extname, join, parse } from 'path';
import { render as renderPug } from 'pug';
import { renderSync as renderSass } from "sass";
import { transpile as renderTs } from 'typescript';
import HtmlValidate from 'html-validate/dist/htmlvalidate';
import * as html5 from 'html-validate/elements/html5.json';
import { RuleConfig } from 'html-validate/dist/config';
import * as htmlRules from './htmlRules.json';
import { getConfig } from '../../extension';
import { sendMessage } from '../../server';

const htmlvalidate = new HtmlValidate({
  elements: [html5],
  rules: htmlRules as RuleConfig
});

export function modifyHTML(filePath: string, content: string, root?: string) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.html') {
    const report = htmlvalidate.validateString(content);
    const messages = report.results?.[0]?.messages?.map(
      ({ message, line, column, severity }) => ({
        msg: `${line}:${column} ${message}`,
        type: ['', 'warn', 'error'][severity]
      })
    ) || [];
    if (!report.valid) return { filePath, messages };
    content = content.replace(/(^|[\n\r]+)\s*|\s+$/g, '');
    return { filePath, content, messages };
  }

  const { pretty, maxLoop, outdir } = getConfig('pugOptions')
  content = content.replace(
    /^(\s*while.*)$/gm,
    '-var _sAfeVar=0;\n$1&&_sAfeVar++<' + maxLoop
  );
  content = renderPug(content, {pretty}).replace(/\/>/g, '>');
  if (root) {
    const dist = outdir ? join(root, outdir) : root;
    content = content.replace(/(?<=(href|src)=").+?(?=")/gi, linkRel => {
      const linkPath = linkRel.includes(':') ? linkRel : join(dist, linkRel);
      if (!linkPath.startsWith(root)) return linkRel;
      return linkPath.slice(root.length + 1).replace(/\\/g, '/');
    });
    outdir && (filePath = join(root, outdir, parse(filePath).name + '.html'));
  }
  return { filePath, content, messages: [] };
}

export function modifyCSS(filePath: string, content: string, root: string) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.css') {
    const re = new RegExp(
      '(".*?"|\'.*?\')|;[\\n\\r\\s]*(})|\\s*[\\n\\r]+\\s*|' + 
      '\\s*([{}():,>~+])\\s*|(calc\\(.*\\))|(\\s*\\/\\*[\\s\\S]*?\\*\\/)',
      'gi'
    );
    content = content.replace(re, '$1$2$3$4');
  } else {
    const { pretty, outdir } = getConfig('sassOptions');
    content = renderSass({
      data: content,
      indentedSyntax: ext === '.sass',
      ...(outdir && pretty ? {} : { outputStyle: 'compressed' })
    }).css.toString();
    outdir && (filePath = join(root, outdir, parse(filePath).name + '.css'));
  }
  const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
  return { fileRel, content };
}

export function modifyJs(content: string, root: string, target: string) {
  content = renderTs(content);
  const fileRel = target.slice(root.length + 1).replace(/\\/g, '/');
  return { fileRel, content };
}