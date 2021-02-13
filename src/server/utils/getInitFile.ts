import { window } from 'vscode'
import { join } from 'path';
import { readdirSync, readFileSync, statSync } from 'fs';
import { getRoot } from '../../extension';

export async function getInitFile(): Promise<{ filePath: string, content: string} | undefined> {
  const activeTab = window.activeTextEditor?.document;
  let filePath = activeTab?.fileName;
  if (filePath && filePath.endsWith('.html')) return { filePath, content: activeTab!.getText() };
  if (!getRoot()) { window.showErrorMessage('No active .html file or directory found.'); return }

  const htmlFiles = await scanForFileType(getRoot()!, '.html');
  const sortedHTMLFiles = [].concat.apply(
    [],
    htmlFiles.map(lvl => lvl.sort((a, b) => (
      a.endsWith('index.html') ? -1 : b.endsWith('index.html') ? 1 : a.localeCompare(b)
    ))) as never
  ).filter(Boolean);
  if (!sortedHTMLFiles.length) { window.showErrorMessage('No .html file in current directory.'); return }

  filePath = sortedHTMLFiles[0];
  return { filePath, content: readFileSync(filePath, 'utf8') };
}

async function scanForFileType(dir: string, type: string) {
  const matches: string[][] = [];
  (function scan(dir: string, lvl: number) {
    readdirSync(dir).forEach(fsNode => {
      const fsPath = join(dir, fsNode);
      if (statSync(fsPath).isDirectory()) scan(fsPath, lvl + 1);
      else fsNode.endsWith(type) && (!matches[lvl] && (matches[lvl] = []), matches[lvl].push(fsPath));
    });
  })(dir, 0);
  return matches;
}