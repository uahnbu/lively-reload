import { extname, join, parse } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { getConfig } from '../../extension';
import { isServerRunning, sendMessage } from '../../server';

type ExportableExtension = '.pug' | '.scss' | '.sass' | '.ts';

export const exportableExtensions = {
  '.pug' : '.html',
  '.scss': '.css' ,
  '.sass': '.css' ,
  '.ts'  : '.js'
};

export async function exportPug(
  content: string,
  filePath: string,
  root: string
) {
  const { packPug } = await import('./packContent');
  const data = await packPug(content, filePath, root);
  sendMessage('editHTML', data);
  const { outdir } = await getConfig('pugOptions');
  const target = getTarget(filePath, outdir, root);
  target && isServerRunning() && writeFileSync(target, data.content!);
}

export function exportScss(content: string, filePath: string, root: string) {
  exportSass(content, filePath, root, 'packScss');
}

export async function exportSass(
  content: string,
  filePath: string,
  root: string,
  packer: 'packScss' | 'packSass' = 'packSass'
) {
  const { [packer]: pack } = await import('./packContent');
  sendMessage('injectCSS', await pack(content, filePath, root));
  const { outdir } = await getConfig('sassOptions');
  const target = getTarget(filePath, outdir, root);
  target && isServerRunning() && (
    writeFileSync(target, await pack(content, filePath) as string)
  );
}

export async function exportTs(
  content: string,
  filePath: string,
  root: string
) {
  const { packTs } = await import('./packContent');
  const { outdir } = await getConfig('typescriptOptions');
  const target = getTarget(filePath, outdir, root);
  if (!target || !isServerRunning()) return;
  const data = await packTs(filePath, content, root);
  writeFileSync(target, data.content);
  sendMessage('reloadJS', data.fileRel);
}

// Get export target file path.
function getTarget(filePath: string, outdir: string | null, root: string) {
  if (outdir == null) return null;
  const ext = extname(filePath).toLowerCase() as ExportableExtension;
  const fileName = parse(filePath).name + exportableExtensions[ext];
  const dist = join(root, outdir);
  !existsSync(dist) && mkdirSync(dist);
  return join(dist, fileName);
}