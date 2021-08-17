import {
  window, workspace, Uri,
  Position, Selection, TextEditorRevealType
} from 'vscode';
import { extname, join } from 'path';
import { HtmlPack, HtmlMessage } from '../../editor';
import { setVirtualDir } from '../../server';

type MessageType = 'info' | 'error' | 'warn';
export function showMessage(msg: string, type: MessageType, options?: object) {
  options ||= { title: 'Dismiss' };
  type === 'info' && window.showInformationMessage(msg, options);
  type === 'error' && window.showErrorMessage(msg, options);
  type === 'warn' && window.showWarningMessage(msg, options);
}

export function getRoot() {
  return workspace.workspaceFolders?.[0].uri.fsPath;
}

type PackerExt = 'Html' | 'Pug' | 'Css' | 'Scss' | 'Sass';
export function getPacker(ext: string) {
  const extCamel = ext[1].toUpperCase() + ext.slice(2);
  const packer = 'pack' + extCamel as `pack${PackerExt}`;
  return packer;
}

export function getActiveHtmlData(): Promise<HtmlPack | HtmlMessage | null>
export function getActiveHtmlData(
  content : string,
  filePath: string,
  ext: string, root?: string
): Promise<HtmlPack | HtmlMessage | null>

export async function getActiveHtmlData(
  content ?: string,
  filePath?: string,
  ext?: string, root?: string
) {
  if (content == null) {
    const document = window.activeTextEditor?.document;
    if (!document) return null;
    content = document.getText();
    filePath = document.fileName;
    ext = extname(filePath).toLowerCase();
    if (ext !== '.html' && ext !== '.pug') return null;
  }
  type Packer = 'packHtml' | 'packPug';
  const packer = getPacker(ext!) as Packer;
  const { [packer]: pack } = await import('../../editor');
  const data = await pack(content, filePath!, root);
  setVirtualDir(data.filePath);
  return data;
}

export async function getConfig(val: string | string[]) {
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

export function focusContent(position: number, filePath: string) {
  const editor = window.activeTextEditor;
  const currentPath = editor?.document.fileName;
  if (!editor || currentPath !== filePath) return;
  const lines = editor.document.getText().split(/\r?\n/);
  let line = -1;
  while (true) {
    const lineLen = lines[++line].trimStart().length;
    if (lineLen > position) break;
    if ((position -= lineLen) === 0) { position = 1; break }
  }
  const character = position + lines[line].search(/\S|$/);
  const newPosition = new Position(line, character);
  const revealType = TextEditorRevealType.InCenter;
  editor.selection = new Selection(newPosition, newPosition);
  editor.revealRange(editor.selection, revealType);
}