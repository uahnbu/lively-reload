import { extname, join, parse } from "path";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { getConfig } from "../../extension";
import { isServerRunning, sendMessage } from "../../server";
import { modifyCSS, modifyHTML, modifyJs } from "./modifyContent";

export function exportPug(filePath: string, content: string, root: string) {
  const data = modifyHTML(filePath, content, root);
  sendMessage('editHTML', data);
  const { outdir } = getConfig('pugOptions');
  const target = getTarget(filePath, outdir, root);
  target && isServerRunning() && writeFileSync(target, data!.content);
}

export function exportSass(filePath: string, content: string, root: string) {
  const data = modifyCSS(filePath, content, root);
  sendMessage('injectCSS', data);
  const { outdir } = getConfig('sassOptions');
  const target = getTarget(filePath, outdir, root);
  target && isServerRunning() && writeFileSync(target, data.content);
}

export function exportTs(filePath: string, content: string, root: string) {
  const { outdir } = getConfig('typescriptOptions');
  const target = getTarget(filePath, outdir, root);
  if (!target || !isServerRunning()) return;
  const data = modifyJs(filePath, content, root);
  writeFileSync(target, data.content);
  sendMessage('reloadJS', data.fileRel);
}

function getTarget(filePath: string, outdir: string | null, root: string) {
  if (outdir === null) return null;
  const extMap = {
    '.pug': '.html',
    '.scss': '.css',
    '.sass': '.css',
    '.ts': '.js'
  };
  type AllowedExtensions = '.pug' | '.scss' | '.sass' | '.ts';
  const ext = extname(filePath).toLowerCase() as AllowedExtensions;
  const fileName = parse(filePath).name + extMap[ext];
  const dist = join(root, outdir);
  !existsSync(dist) && mkdirSync(dist);
  return join(dist, fileName);
}
