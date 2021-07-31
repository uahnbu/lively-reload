import {
  TextDocument,
  TextDocumentChangeEvent,
  TextEditorSelectionChangeEvent,
  TextEditor
} from 'vscode';
import { getRoot } from '../../extension';
import { isServerRunning, sendMessage } from '../../server';
import { extname } from 'path';

const exportableExtensions = new Set(['.pug', '.scss', '.sass', '.ts']);

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
  if (!exportableExtensions.has(ext)) return;
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

export function selectionOnChange(event: TextEditorSelectionChangeEvent) {
  if (!isServerRunning()) return;
  const { fileName, getText } = event.textEditor.document;
  const ext = extname(fileName).toLowerCase();
  if (changingContent || ext !== '.html') {
    changingContent = false;
    return;
  }
  handleChange(getText(), fileName, 'file');
}

export function activeFileOnChange(event?: TextEditor) {
  if (!event || !isServerRunning()) return;
  const { fileName, getText } = event.document;
  handleChange(getText(), fileName, 'tab');
  changingContent = true;
}

type Change = 'file' | 'tab';
async function handleChange(content: string, filePath: string, type: Change) {
  type PackerExt = 'Css' | 'Scss' | 'Sass' | 'Html' | 'Pug';
  const root = getRoot();
  const ext = extname(filePath).toLowerCase();
  const extCamel = ext[1].toUpperCase() + ext.slice(2);
  const packer = 'pack' + extCamel as `pack${PackerExt}`;
  switch (ext) {
    case '.css':
    case '.scss':
    case '.sass': {
      if (!root || !isServerRunning || !filePath.startsWith(root)) break;
      const { [packer]: pack } = await import('./packContent');
      sendMessage('injectCSS', await pack(content, filePath, root));
      break;
    }
    case '.html':
    case '.pug': {
      const { [packer]: pack } = await import('./packContent');
      const data = await pack(content, filePath, root);
      sendMessage(type === 'file' ? 'editHTML' : 'switchHTML', data);
    }
  }
}