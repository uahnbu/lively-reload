import {
  TextDocument,
  TextDocumentChangeEvent,
  TextEditorSelectionChangeEvent,
  TextEditor
} from 'vscode';
import { extname } from 'path';
import { getActiveHtmlData, getPacker, getRoot } from '../../extension';
import { isServerRunning, sendMessage } from '../../server';
import { exportableExtensions } from './exportContent';

let changingContent = false;

export async function editorOnSave(event: TextDocument) {
  const { fileName, getText } = event;
  const root = getRoot();
  if (!root || !isServerRunning() || !fileName.startsWith(root)) return;
  const ext = extname(fileName).toLowerCase();
  if (ext === '.js') {
    const modifiedPath = fileName.slice(root.length + 1).replace(/\\/g, '/');
    sendMessage('reloadJS', modifiedPath);
    return;
  }
  if (!exportableExtensions.hasOwnProperty(ext)) return;
  type PackerExt = 'Pug' | 'Scss' | 'Sass' | 'Ts';
  const extCamel = ext[1].toUpperCase() + ext.slice(2);
  const exporter = 'export' + extCamel as `export${PackerExt}`;
  const { [exporter]: exportFile } = await import('./exportContent');
  exportFile(getText(), fileName, root);
}

export function editorOnChange(event: TextDocumentChangeEvent) {
  const { contentChanges, document } = event;
  const { fileName, getText } = document;
  if (!isServerRunning() || !contentChanges.length) return;
  handleChange(getText(), fileName, 'file');
  changingContent = true;
}

export async function selectionOnChange(event: TextEditorSelectionChangeEvent) {
  if (!isServerRunning()) return;
  const { fileName, getText } = event.textEditor.document;
  const ext = extname(fileName).toLowerCase();
  // selectionOnChange is also called when the file content is being edited.
  if (changingContent) { changingContent = false; return }
  if (ext === '.html') {
    const { packHtml } = await import('./packContent');
    const { filePath, highlightIds } = await packHtml(getText(), fileName);
    sendMessage('highlightHtml', { filePath, highlightIds });
  }
  if (ext === '.css') {
    const root = getRoot();
    if (!root || !fileName.startsWith(root)) return;
    const { packCss } = await import('./packContent');
    const { fileRel, highlightIds } = await packCss(getText(), fileName, root);
    sendMessage('highlightCss', { fileRel, highlightIds });
  }
}

export function activeFileOnChange(event?: TextEditor) {
  // activeFileOnChange is also called when activeFile is set to undefined.
  if (!event || !isServerRunning()) return;
  const { fileName, getText } = event.document;
  handleChange(getText(), fileName, 'tab');
  changingContent = true;
}

type Change = 'file' | 'tab';
async function handleChange(content: string, filePath: string, type: Change) {
  const root = getRoot();
  const ext = extname(filePath).toLowerCase();
  const htmlData = getActiveHtmlData(content, filePath, ext, root);
  if (htmlData) {
    type === 'file' && sendMessage('editHTML', htmlData);
    type === 'tab' && sendMessage('switchHTML', htmlData);
    return;
  }
  if (ext === '.css' || ext === '.scss' || ext === '.sass') {
    if (!root || !isServerRunning || !filePath.startsWith(root)) return;
    type Packer = `pack${'Css' | 'Scss' | 'Sass'}`;
    const packer = getPacker(ext) as Packer;
    const { [packer]: pack } = await import('./packContent');
    sendMessage('injectCSS', await pack(content, filePath, root));
  }
}