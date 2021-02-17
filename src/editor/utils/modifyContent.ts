import { extname, join } from 'path';
import { render } from 'pug';
import { renderSync } from 'sass';
import { getRoot, getConfig } from '../../extension';

export function modifyHTML(filePath: string, content: string) {
  const root = getRoot();
  const ext = extname(filePath).toLowerCase();
  let dist = join(filePath, '..');
  if (ext === '.pug') {
    dist = getConfig('pug-options').outdir;
    content = render(content);
  } else {
    content = content.replace(/(^|[\n\r]+)\s*|\s+$/g, '');
  }
  content = content.replace(/(?<=(href|src)=").+?(?=")/gi, linkRel => {
    const linkPath = linkRel.includes(':') ? linkRel : join(dist, linkRel);
    if (!root || !linkPath.startsWith(root)) return linkRel;
    return linkPath.slice(root.length + 1).replace(/\\/g, '/');
  });
  return { filePath, content };
}

export function modifyCSS(filePath: string, content: string) {
  const root = getRoot();
  if (!root || !filePath.startsWith(root)) return;
  const ext = extname(filePath).toLowerCase();
  if (ext === '.scss' || ext === '.sass') {
    filePath = filePath.slice(0, -4) + 'css';
    content = renderSync({
      data: content,
      outputStyle: 'compressed',
      indentedSyntax: ext === '.sass'
    }).css.toString();
  } else {
    const regex = /(".*?"|'.*?')|;[\n\r\s]*(})|\s*[\n\r]+\s*|\s*([{}():,>~+])\s*|(calc\(.*\))|(\s*\/\*[\s\S]*?\*\/)/gi;
    content = content.replace(regex, '$1$2$3$4');
  }
  const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
  console.log(fileRel, content);
  return { fileRel, content };
}