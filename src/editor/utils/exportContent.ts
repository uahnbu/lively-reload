import { extname, join, parse } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { render as renderPug } from "pug";
import { getConfig, getRoot } from "../../extension";
import { renderSync as renderSass } from "sass";
import { transpile as renderTs } from 'typescript';

export function exportPug(filePath: string, content: string) {
  const target = getTarget(filePath);
  if (!target) return;
  const options = { pretty: getConfig('pug-options').pretty };
  writeFileSync(target, renderPug(content, options));
}

export function exportSass(filePath: string, content: string) {
  const target = getTarget(filePath);
  if (!target) return;
  content = renderSass({
    data: content,
    indentedSyntax: extname(filePath).toLowerCase() === '.sass',
    outputStyle: getConfig('sass-options').pretty ? 'expanded' : 'compressed'
  }).css.toString();
  writeFileSync(target, content);
}

export function exportTs(filePath: string, content: string) {
  const target = getTarget(filePath);
  if (!target) return;
  writeFileSync(target, renderTs(content));
}

function getTarget(filePath: string) {
  const root = getRoot();
  if (!root) return;
  const extMap = { '.pug': '.html', '.scss': '.css', '.sass': '.css', '.ts': '.js' };
  const ext = extname(filePath).toLowerCase() as '.pug' | '.scss' | '.sass' | '.ts';
  const configs = getConfig((ext === '.scss' ? 'sass' : ext.slice(1)) + '-options');
  const fileName = parse(filePath).name + extMap[ext];
  const dist = join(root, configs.outdir);
  !existsSync(dist) && mkdirSync(dist);
  return join(dist, fileName);
}
