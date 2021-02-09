import { TextDocument, TextDocumentChangeEvent, workspace } from 'vscode';
import { modifyHTML, sendMessage } from '../../server';

const changedFiles = new Map<string, string>();

export function editorOnSave({fileName}: TextDocument) {
  changedFiles.has(fileName) && changedFiles.delete(fileName);
  sendMessage({ task: 'reload' });
}

export function editorOnChange(event: TextDocumentChangeEvent) {
  if (!event.contentChanges.length) return;
  const root = workspace.workspaceFolders?.[0].uri.fsPath;
  if (!root) return;
  const file = event.document.fileName;
  if (!file.startsWith(root)) return;
  const content = event.document.getText();
  handleFileChange(file, content);
}

function handleFileChange(file: string, content: string) {
  const msg: { task?: 'injectCSS' | 'injectHTML', data?: string } = {};
  const fileName = file.match(/(?<=\\)[^\\]+(?=\.[^.\\]+$)/)![0];
  if (file.endsWith('.css')) {
    content = minifyCSS(content);
    msg.task = 'injectCSS';
    msg.data = JSON.stringify({fileName, content});
  }
  if (file.endsWith('.html')) {
    msg.task = 'injectHTML';
    content = modifyHTML(content);
    const livelyContainer = content.match(/<div id="lively-container"[\s\S]+<\/div>/)![0];
    msg.data = livelyContainer;
  }
  msg.task && sendMessage(msg as { task: string });
}

function minifyCSS(content: string) {
  const regex = /(".*?"|'.*?')|;[\n\r\s]*(})|\s*[\n\r]+\s*|\s*([{}():,>~+])\s*|(calc\(.*\))|(\s*\/\*[\s\S]*?\*\/)/g;
  return content.replace(regex, '$1$2$3$4');
}