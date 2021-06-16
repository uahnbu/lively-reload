import { window, workspace } from 'vscode';
import {
  editorOnChange,
  editorOnSave,
  activeFileOnChange
} from './utils/handleEditor';

export { modifyHTML } from './utils/modifyContent';

workspace.onDidChangeTextDocument(editorOnChange);
workspace.onDidSaveTextDocument(editorOnSave);
window.onDidChangeActiveTextEditor(activeFileOnChange);