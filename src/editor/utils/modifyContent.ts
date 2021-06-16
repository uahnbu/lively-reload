import { extname, join, parse } from 'path';
import { render } from 'pug';
import { renderSync } from 'sass';
import { getRoot, getConfig } from '../../extension';

export function modifyHTML(filePath: string, content: string) {
  const root = getRoot();
  let dist = join(filePath, '..');
  if (extname(filePath).toLowerCase() === '.pug') {
    if (!root) return;
    const { outdir, maxLoop } = getConfig('pugOptions');
    dist = join(root, outdir);
    content = content.replace(
      /^(\s*while.*)$/gm,
      '-var _sAfeVar=0;\n$1&&_sAfeVar++<' + maxLoop
    );
    content = render(content).replace(/\/>/g, '>');
  } else content = content.replace(/(^|[\n\r]+)\s*|\s+$/g, '');

  content = content.replace(/(?<=(href|src)=").+?(?=")/gi, linkRel => {
    const linkPath = linkRel.includes(':') ? linkRel : join(dist, linkRel);
    if (!root || !linkPath.startsWith(root)) return linkRel;
    return linkPath.slice(root.length + 1).replace(/\\/g, '/');
  });
  filePath = join(dist, parse(filePath).name + '.html');
  return { filePath, content };
}

export function modifyCSS(filePath: string, content: string) {
  const root = getRoot();
  if (!root || !filePath.startsWith(root)) return;
  const ext = extname(filePath).toLowerCase();
  let fileRel = filePath.slice(root.length + 1);
  if (ext === '.css') {
    const re = new RegExp(
      `(".*?"|'.*?')|` +
      `;[\\n\\r\\s]*(})|` +
      `\\s*[\\n\\r]+\\s*|` +
      `\\s*([{}():,>~+])\\s*|` +
      `(calc\\(.*\\))|` +
      `(\\s*\\/\\*[\\s\\S]*?\\*\\/)`,
      'gi'
    );
    content = content.replace(re, '$1$2$3$4');
  } else {
    fileRel = join(
      getConfig('sassOptions').outdir,
      parse(filePath).name + '.css'
    );
    content = renderSync({
      data: content,
      outputStyle: 'compressed',
      indentedSyntax: ext === '.sass'
    }).css.toString();
  }
  fileRel = fileRel.replace(/\\/g, '/');
  return { fileRel, content };
}