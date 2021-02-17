import { Uri, window, workspace } from 'vscode';
import { extname, join } from 'path';
import { modifyHTML } from '../../editor';
import { exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';

export function getRoot() { return workspace.workspaceFolders?.[0].uri.fsPath }

export function getActiveFile() {
  const activeTab = window.activeTextEditor?.document;
  if (!activeTab) return;
  const activePath = activeTab.fileName;
  const ext = extname(activePath).toLowerCase();
  if (ext !== '.html' && ext !== '.pug') return null;
  return modifyHTML(activePath, activeTab.getText());
}

export function getConfig(prop: string) {
  let val;
  (() => {
    const root = getRoot();
    if (!root) return;
    const pkgPath = join(root, 'package.json');
    if (!existsSync(pkgPath)) return;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    val = pkg['lively-reload-configuration']?.[prop];
  })();
  !val && (val = workspace.getConfiguration('lively-reload').get(prop));
  return val;
}

export function openUrl(url: string) {
  const cmd = { darwin: 'open', win32: 'start' }[process.platform as 'darwin' | 'win32'] || 'xdg-open';
  return exec(cmd + ' ' + Uri.parse(url.replace(/"/g, '\\"')));
}