import { Uri, window, workspace } from 'vscode';
import { extname } from 'path';

export function getRoot() {
  return workspace.workspaceFolders?.[0].uri.fsPath;
}

export async function getActiveFile() {
  const activeTab = window.activeTextEditor?.document;
  if (!activeTab) return null;
  const activePath = activeTab.fileName;
  const ext = extname(activePath).toLowerCase();
  if (ext !== '.html' && ext !== '.pug') return null;
  const extCamel = ext[1].toUpperCase() + ext.slice(2);
  const packer = 'pack' + extCamel as 'packHtml' | 'packPug';
  const { [packer]: pack } = await import('../../editor');
  return await pack(activeTab.getText(), activePath, getRoot());
}

export async function getConfig(val: string | string[]) {
  const { join } = await import('path');
  const { existsSync, readFileSync } = await import('fs');
  const vsConfigHub = workspace.getConfiguration('livelyReload');
  const config = typeof val === 'string'
    ? vsConfigHub.get<any>(val)
    : val.reduce<any>((c, e) => (c[e] = vsConfigHub.get(e), c), {} as K);
  const root = getRoot();
  if (!root) return config;
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return config;
  const pkgConfigHub = JSON.parse(readFileSync(pkgPath, 'utf-8'))?.livelyReload;
  if (typeof val === 'string') {
    const pkgConfig = pkgConfigHub?.[val];
    if (typeof config !== 'object') return pkgConfig ?? config;
    return { ...config, ...pkgConfig };
  }
  for (const prop in config) {
    config[prop] = typeof config[prop] === 'object'
      ? { ...config[prop], ...pkgConfigHub?.[prop] }
      : pkgConfigHub?.[prop] ?? config[prop];
  }
  return config;
}

export async function openBrowser(url: string) {
  const { exec } = await import('child_process');
  if (! await getConfig('openBrowser')) return;
  const someProcess = process.platform as 'darwin' | 'win32';
  const cmd = { darwin: 'open', win32: 'start' }[someProcess] || 'xdg-open';
  exec(cmd + ' ' + Uri.parse(url.replace(/"/g, '\\"')));
}

type MessageType = 'info' | 'error' | 'warn';
export function showMessage(msg: string, type: MessageType, options?: object) {
  options ||= { title: 'Dismiss' };
  type === 'info' && window.showInformationMessage(msg, options);
  type === 'error' && window.showErrorMessage(msg, options);
  type === 'warn' && window.showWarningMessage(msg, options);
}