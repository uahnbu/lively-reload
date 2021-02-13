import { TextDocument, TextDocumentChangeEvent, TextEditor, workspace } from 'vscode';
import { join } from 'path';
import { isServerRunning, sendMessage } from '../../server';

export function getRoot() { return workspace.workspaceFolders?.[0].uri.fsPath }

export function editorOnSave({ fileName: filePath }: TextDocument) {
  sendMessage('reload', filePath);
}

export function editorOnChange({ contentChanges, document }: TextDocumentChangeEvent) {
  if (!isServerRunning() || !contentChanges.length) return;
  handleFileChange(document.fileName, document.getText(), true);
}

export function activeFileOnChange(event: TextEditor | undefined) {
  if (!event || !isServerRunning()) return;
  const document = event.document;
  handleFileChange(document.fileName, document.getText(), false);
}

export function modifyHTML(html: string, filePath: string) {
  html = html.replace(/(^|[\n\r]+)\s*|\s+$/g, '');
  html = html.replace(/(?<= (href|src)=").+?(?=")/g, linkRel => {
    const root = getRoot();
    const linkPath = join(filePath, '..', linkRel);
    if (!root || !linkPath.startsWith(root)) return linkRel;
    return linkPath.slice(root.length + 1).replace(/\\/g, '/');
  });
  return { filePath, content: html };
}

function handleFileChange(filePath: string, content: string, isDirty = false) {
  if (filePath.endsWith('.css')) {
    const root = getRoot();
    if (!root || !filePath.startsWith(root)) return;

    const fileRel = filePath.slice(root.length + 1).replace(/\\/g, '/');
    content = minifyCSS(content);
    sendMessage('injectCSS', { fileRel, content });
  }
  if (filePath.endsWith('.html')) {
    const msg = modifyHTML(content, filePath);
    // if (!validateHTML(msg.content)) return;
    sendMessage(isDirty ? 'editHTML' : 'switchHTML', msg);
  }
}

function minifyCSS(content: string) {
  const regex = /(".*?"|'.*?')|;[\n\r\s]*(})|\s*[\n\r]+\s*|\s*([{}():,>~+])\s*|(calc\(.*\))|(\s*\/\*[\s\S]*?\*\/)/g;
  return content.replace(regex, '$1$2$3$4');
}

function validateHTML(html: string) {
  const regex = /<(.+?).*?>(.*?)<\/\1>|<(!doctype|area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr).*?>/gi;
  while (true) {
    const replaced = html.replace(regex, '$2');
    if (replaced.length === html.length) return !html.includes('<');
    html = replaced;
  }
}