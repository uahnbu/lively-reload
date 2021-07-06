import {
  TextDocument,
  TextDocumentChangeEvent,
  TextEditor,
  TextEditorSelectionChangeEvent
} from 'vscode';
import { modifyHTML, modifyCSS } from './modifyContent';
import { getRoot } from '../../extension';
import { isServerRunning, sendMessage } from '../../server';
import { extname } from 'path';
import { exportPug, exportSass, exportTs } from './exportContent';

export function editorOnSave({ fileName: filePath, getText }: TextDocument) {
  const root = getRoot();
  if (!root || !isServerRunning() || !filePath.startsWith(root)) return;
  switch (extname(filePath).toLowerCase()) {
    case '.js':
      const modifiedPath = filePath.slice(root.length + 1).replace(/\\/g, '/');
      sendMessage('reloadJS', modifiedPath);
      break;
    case '.pug': exportPug(filePath, getText(), root); break;
    case '.ts': exportTs(filePath, getText(), root); break;
    case '.scss':
    case '.sass': exportSass(filePath, getText(), root);
  }
}

export function editorOnChange({ contentChanges, document }: TextDocumentChangeEvent) {
  if (!isServerRunning() || !contentChanges.length) return;
  const content = document.getText();
  const filePath = document.fileName;
  handleChange(filePath, content, 'file');
}

export function activeFileOnChange(event: TextEditor | undefined) {
  if (!event || !isServerRunning()) return;
  const { fileName, getText } = event.document;
  handleChange(fileName, getText(), 'tab');
}

export function selectionOnChange(event: TextEditorSelectionChangeEvent) {
  
}

function handleChange(filePath: string, content: string, type: 'file' | 'tab') {
  const root = getRoot();
  switch (extname(filePath).toLowerCase()) {
    case '.css':
    case '.scss':
    case '.sass': {
      if (!root || !isServerRunning || !filePath.startsWith(root)) break;
      sendMessage('injectCSS', modifyCSS(filePath, content, root));
      break;
    }
    case '.html':
    case '.pug': {
      const data = modifyHTML(filePath, content, root);
      sendMessage(type === 'file' ? 'editHTML' : 'switchHTML', data);
    }
  }
}