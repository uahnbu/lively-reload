import { TextDocument, TextDocumentChangeEvent, TextEditor } from 'vscode';
import { modifyHTML, modifyCSS } from './modifyContent';
import { getRoot } from '../../extension';
import { isServerRunning, sendMessage } from '../../server';
import { extname } from 'path';
import { exportPug, exportSass, exportTs } from './exportContent';

export function editorOnSave({ fileName: filePath, getText }: TextDocument) {
  const root = getRoot();
  if (!root/* || !isServerRunning */ || !filePath.startsWith(root)) return;
  switch (extname(filePath).toLowerCase()) {
    case '.js': sendMessage('reloadJS', filePath.slice(root.length + 1).replace(/\\/g, '/')); break;
    case '.pug': exportPug(filePath, getText()); break;
    case '.scss':
    case '.sass':
      exportSass(filePath, getText()); break;
    case '.ts':
      exportTs(filePath, getText());
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

function handleChange(filePath: string, content: string, type: 'file' | 'tab') {
  switch (extname(filePath).toLowerCase()) {
    case '.css':
    case '.scss':
    case '.sass':
      sendMessage('injectCSS', modifyCSS(filePath, content));
      break;
    case '.html':
    case '.pug':
      sendMessage(type === 'file' ? 'editHTML' : 'switchHTML', modifyHTML(filePath, content));
  }
}