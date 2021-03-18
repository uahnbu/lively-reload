import { extname, join, parse } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { render as renderPug } from "pug";
import { getConfig, getRoot } from "../../extension";
import { renderSync as renderSass } from "sass";
import { transpile as renderTs } from 'typescript';
import { sendMessage } from "../../server";
import { modifyCSS } from "./modifyContent";

export function exportPug(filePath: string, content: string) {
  const { pretty, outdir } = getConfig('pugOptions');
  if (outdir === null) return;
  const target = getTarget(filePath, outdir);
  if (!target) return;
  content = renderPug(content, {pretty});
  writeFileSync(target, content);
}

export function exportSass(filePath: string, content: string) {
  sendMessage('injectCSS', modifyCSS(filePath, content));
  const { pretty, outdir } = getConfig('sassOptions');
  if (outdir === null) return;
  const target = getTarget(filePath, outdir);
  if (!target) return;
  content = renderSass({
    data: content,
    indentedSyntax: extname(filePath).toLowerCase() === '.sass',
    ...(pretty ? {} : { outputStyle: 'compressed' })
  }).css.toString();
  writeFileSync(target, content);
}

export function exportTs(filePath: string, content: string) {
  const { outdir } = getConfig('typescriptOptions');
  if (outdir === null) return;
  const target = getTarget(filePath, outdir);
  if (!target) return;
  sendMessage('reloadJS', target.slice(getRoot()!.length + 1));
  writeFileSync(target, renderTs(content));
}

function getTarget(filePath: string, outdir: string) {
  const root = getRoot();
  if (!root) return;
  const extMap = { '.pug': '.html', '.scss': '.css', '.sass': '.css', '.ts': '.js' };
  const ext = extname(filePath).toLowerCase() as '.pug' | '.scss' | '.sass' | '.ts';
  const fileName = parse(filePath).name + extMap[ext];
  const dist = join(root, outdir);
  !existsSync(dist) && mkdirSync(dist);
  return join(dist, fileName);
}
