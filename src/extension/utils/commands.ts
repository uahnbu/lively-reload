import { Uri, window, workspace } from 'vscode';
import { extname, join } from 'path';
import { modifyHTML } from '../../editor';
import { exec } from 'child_process';
import { existsSync, readFileSync } from 'fs';

const modifierKeyMap: { [key: string]: string } = {
  'ctrl': '^^^^', 'shift': '+', 'alt': '%'
};

export function getRoot() {
  return workspace.workspaceFolders?.[0].uri.fsPath;
}

export function getActiveFile() {
  const activeTab = window.activeTextEditor?.document;
  if (!activeTab) return null;
  const activePath = activeTab.fileName;
  const ext = extname(activePath).toLowerCase();
  if (ext !== '.html' && ext !== '.pug') return null;
  return modifyHTML(activePath, activeTab.getText(), getRoot());
}

export function getConfig(val: string | string[]) {
  const vsConfigHub = workspace.getConfiguration('livelyReload');
  const config = typeof val === 'string'
    ? vsConfigHub.get(val) as any
    : val.reduce((c, e) => (c[e] = vsConfigHub.get(e), c), {} as K) as any;
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

export function openBrowser(url: string) {
  if (!getConfig('openBrowser')) return;
  const someProcess = process.platform as 'darwin' | 'win32';
  const cmd = { darwin: 'open', win32: 'start' }[someProcess] || 'xdg-open';
  exec(cmd + ' ' + Uri.parse(url.replace(/"/g, '\\"')));
}

export function openDevtools() {
  const { enabled, keybinding } = getConfig('debug');
  if (!enabled) return;
  const keys = keybinding.split('+').map((key: string) => (
    modifierKeyMap[key.toLowerCase()] || key
  ));
  sendWindowsKey(keys.join(''));
}

export function sendWindowsKey(keyString: string) {
  if (process.platform !== 'win32') return;
  const fileName = 'sCrIPt_' + Date.now() + '.vbs';
  exec(`(echo|set /p="set shell=CreateObject("WScript.Shell"):${''
    }shell.SendKeys "${keyString}":${''
    }set fso=CreateObject("Scripting.FileSystemObject"):${''
    }fso.DeleteFile Wscript.ScriptFullName") > ${fileName} & ${fileName}`);
}

type MessageType = 'info' | 'error' | 'warn';
export function showMessage(msg: string, type: MessageType, options?: object) {
  options ||= { title: 'Dismiss' };
  type === 'info' && window.showInformationMessage(msg, options);
  type === 'error' && window.showErrorMessage(msg, options);
  type === 'warn' && window.showWarningMessage(msg, options);
}