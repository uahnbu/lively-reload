import { window, workspace } from 'vscode';
import {
  editorOnChange,
  editorOnSave,
  selectionOnChange,
  activeFileOnChange
} from './utils/handleEditor';

export { packHtml, packPug } from './utils/packContent';

export function listenEditorEvents() {
  // TextDocumentChange must be listened before TextEditorSelectionChange
  workspace.onDidChangeTextDocument(editorOnChange);
  workspace.onDidSaveTextDocument(editorOnSave);
  window.onDidChangeTextEditorSelection(selectionOnChange);
  window.onDidChangeActiveTextEditor(activeFileOnChange);
}