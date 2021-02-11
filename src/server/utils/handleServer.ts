import { Uri, window, workspace } from 'vscode';
import { Server } from 'http';
import { Socket } from 'net';
import { Express, static as staticDir } from 'express';
import { join } from 'path';
import { exec } from 'child_process';
import { statusButton } from '../../extension';
import { getRoot, getInitFile } from './getInitFile';
import { setInitPong } from './websocket';
import modifyHTML from './modifyHTML';

const $configs = workspace.getConfiguration('lively-reload');

let $app: Express;
let $server: Server;
let $sockets: Set<Socket>;
let $serverRunning = false;

export function isServerRunning() { return $serverRunning }
export function initServerHandler(app: Express, server: Server, sockets: Set<Socket>) {
  $app = app, $server = server, $sockets = sockets;
}

export function startServer() {
  const port = $configs.get('port');
  const startMessage = 'Server started on 127.0.0.1:' + port + '.';
  const root = getRoot();
  
  $app.get('/', async (_req, res) => {
    const { filePath, content } = await getInitFile() || {};
    res.sendFile(join(__dirname, '../assets/index.html'), 'utf8');
    content && setInitPong('editHTML', { filePath, content: modifyHTML(content) });
  });
  root && $app.use(staticDir(root));
  
  $server.listen(port, () => window.showInformationMessage(startMessage, { title: 'Dismiss' }));
  $serverRunning = true;

  // openUrl('http://127.0.0.1:' + port);
  statusButton.setLoading();
}

export function closeServer() {
  $server.close();
  $sockets.forEach(socket => socket.destroy());
  $serverRunning = false;
  statusButton.setDoStart();
}

function openUrl(url: string) {
  const cmd = { darwin: 'open', win32: 'start' }[process.platform as 'darwin' | 'win32'] || 'xdg-open';
  return exec(cmd + ' ' + Uri.parse(url.replace(/"/g, '\\"')));
}