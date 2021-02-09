import { Uri } from 'vscode';
import { exec } from 'child_process';

export function openUrl(url: string) {
  const cmd = { darwin: 'open', win32: 'start' }[process.platform as 'darwin' | 'win32'] || 'xdg-open';
  return exec(cmd + ' ' + Uri.parse(url.replace(/"/g, '\\"')));
}