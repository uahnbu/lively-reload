import { TextDocument, TextDocumentChangeEvent, TextEditor, workspace } from 'vscode';
import { isServerRunning, modifyHTML, sendMessage, getRoot } from '../../server';

const changedFiles = new Map<string, string>();

export function activeFileOnChange(event: TextEditor | undefined) {
  if (!event) return;
}

export function editorOnSave({fileName: filePath}: TextDocument) {
  changedFiles.has(filePath) && changedFiles.delete(filePath);
  sendMessage('reload');
}

export function editorOnChange({ contentChanges, document }: TextDocumentChangeEvent) {
  if (!isServerRunning() || !contentChanges.length || !workspace.workspaceFolders) return;
  const root = workspace.workspaceFolders[0].uri.fsPath;
  if (!document.fileName.startsWith(root)) return;
  handleFileChange(document.fileName, document.getText());
}

function handleFileChange(filePath: string, content: string) {
  if (filePath.endsWith('.css')) {
    const fileRel = filePath.match(/(?<=\\)[^\\]+(?=\.[^.\\]+$)/)![0];
    content = minifyCSS(content);
    sendMessage('injectCSS', {fileRef: fileRel, content});
  }
  if (filePath.endsWith('.html')) {
    content = modifyHTML(content).match(/<div id="lively-container".+<\/div>/)![0]
    sendMessage('editHTML', {filePath, content});
  }
}

function minifyCSS(content: string) {
  const regex = /(".*?"|'.*?')|;[\n\r\s]*(})|\s*[\n\r]+\s*|\s*([{}():,>~+])\s*|(calc\(.*\))|(\s*\/\*[\s\S]*?\*\/)/g;
  return content.replace(regex, '$1$2$3$4');
}