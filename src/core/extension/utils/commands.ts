import {
  window, workspace, Uri,
  Position, Selection, TextEditorRevealType
} from 'vscode';
import { extname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { exec } from 'child_process';

export function showMessage(msg: string, type: MessageType, options?: object) {
  options ||= { title: 'Dismiss' };
  type === 'info' && window.showInformationMessage(msg, options);
  type === 'error' && window.showErrorMessage(msg, options);
  type === 'warn' && window.showWarningMessage(msg, options);
}

export function getRoot() {
  return workspace.workspaceFolders?.[0].uri.fsPath;
}

export function getPacker(ext: string) {
  const extCamel = ext[1].toUpperCase() + ext.slice(2);
  const packer = 'pack' + extCamel as Pack<DomExtCamel | StyleExtCamel>;
  return packer;
}

export function getActiveHtmlData(): Promise<HtmlPack | HtmlError | null>
export function getActiveHtmlData(
  content : string,
  filePath: string,
  ext: string, root?: string
): Promise<HtmlPack | HtmlError | null>

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
  }
  if (ext !== '.html' && ext !== '.pug') return null;
  const packer = getPacker(ext!) as Pack<DomExtCamel>;
  const { [packer]: pack } = await import('../../editor');
  const data = await pack(content, filePath!, root);
  const { setVirtualDir } = await import('../../server');
  setVirtualDir(data.filePath);
  return data;
}

// If val is a string, return the corresponding config.
// If val is an array, return an object containing the corresponding configs.
export function getConfig(val: string | string[]) {
  const vsConfigHub = workspace.getConfiguration('livelyReload');
  const config = typeof val === 'string'
    ? vsConfigHub.get(val)
    : val.reduce<any>((c, e) => (c[e] = vsConfigHub.get(e), c), {} as K);
  const root = getRoot();
  if (!root) return config;
  const pkgPath = join(root, 'package.json');
  if (!existsSync(pkgPath)) return config;

  const pkgConfigHub = JSON.parse(readFileSync(pkgPath, 'utf-8'))?.livelyReload;
  if (!pkgConfigHub) return config;

  const pkgConfig = typeof val === 'string' ? pkgConfigHub[val] : pkgConfigHub;
  if (typeof config === 'object' && typeof pkgConfig === 'object') {
    mergeObjects(config, pkgConfig);
    return config;
  }
  return pkgConfig ?? config;
}

function mergeObjects(source: K, target: K) {
  for (const prop in target) {
    if (typeof target[prop] === 'object') {
      if (typeof source[prop] !== 'object') source[prop] = {};
      mergeObjects(source[prop], target[prop]);
    } else source[prop] = target[prop];
  }
}

export function openBrowser(url: string) {
  if (!getConfig('openBrowser')) return;
  const someProcess = process.platform as 'darwin' | 'win32';
  const cmd = { darwin: 'open', win32: 'start' }[someProcess] || 'xdg-open';
  exec(cmd + ' ' + Uri.parse(url.replace(/"/g, '\\"')));
}

export function focusContent(position: number, filePath: string) {
  const editor = window.activeTextEditor;
  const currentPath = editor?.document.fileName;
  if (!editor || currentPath !== filePath) return;
  const content = editor.document.getText();
  const lines: { content: string, length: number, breaks: number }[] = [];
  const re = /(^|[\r\n]+).*/g;
  let match: RegExpExecArray | null;
  while (true) {
    if (!(match = re.exec(content))) break;
    lines[lines.length] = {
      content: match[0],
      length: match[0].length,
      breaks: match[1].length
    };
  }
  let line = -1;
  while (true) {
    const lineLen = lines[++line].length;
    if (lineLen > position) break;
    // If the left tag end is at the end of the line or it is a self-closing
    // tag, put the pointer right after the tag name.
    if ((position -= lineLen) === 0) {
      const match = lastMatch(lines[line].content, /<\w+/);
      position = match ? match.index! + match[0].length : lines[line].breaks;
      break;
    }
  }
  const character = position - lines[line].breaks;
  const newPosition = new Position(line, character);
  const revealType = TextEditorRevealType.InCenter;
  editor.selection = new Selection(newPosition, newPosition);
  editor.revealRange(editor.selection, revealType);
}

function lastMatch(str: string, re: RegExp, pivot = str.length - 1) {
  if (pivot >= str.length) return null;
  for (let i = pivot, substr = str.slice(pivot + 1); i !== -1; --i) {
    substr = str[i] + substr;
    const match = substr.match(re);
    if (match && (match.index! += i) <= pivot) return match;
  }
  return null;
}

// In case matches don't overlap with each other.
// function lastMatch(str: string, re: RegExp, index = str.length - 1) {
//   const flagsWithGlobal = [...new Set([...re.flags + 'g'])].join('');
//   re = RegExp(re, flagsWithGlobal);
//   let match: RegExpExecArray | null = null;
//   while (true) {
//     const next = re.exec(str);
//     if (next === null || next.index > index) return match;
//     match = next;
//   }
// }