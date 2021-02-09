import { TextDocumentChangeEvent, workspace } from 'vscode';
import { modifyHTML, webSocket } from '../../server';

export function editorOnSave() {
  webSocket.sendMessage({ task: 'reload' });
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
    msg.task = 'injectCSS';
    msg.data = JSON.stringify({fileName, content});
  }
  if (file.endsWith('.html')) {
    msg.task = 'injectHTML';
    content = modifyHTML(content);
    const livelyContainer = content.match(/<div id="lively-container"[\s\S]+<\/div>/)![0];
    msg.data = livelyContainer;
  }
  msg.task && webSocket.sendMessage(msg as { task: string });
}