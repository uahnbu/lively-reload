import { window, workspace } from 'vscode';
import { Server } from 'http';
import { Socket } from 'net';
import { Express, static as staticDir } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { statusButton, openUrl } from '../../extension';
import modifyHTML from './modifyHTML';

const configs = workspace.getConfiguration('lively-reload');

let app: Express;
let server: Server;
let sockets: Set<Socket>;
let serverRunning = false;

export function initServerHandler(myApp: Express, myServer: Server, mySockets: Set<Socket>) {
  app = myApp;
  server = myServer;
  sockets = mySockets;
}

export function isServerRunning() { return serverRunning }

export function startServer() {
  const [port, dir] = ['port', 'dir'].map(prop => configs.get(prop));
  const root = workspace.workspaceFolders?.[0].uri.fsPath;
  const startMessage = 'Server started on 127.0.0.1:' + port + '.';

  if (!root) { window.showErrorMessage('No directory found.'); return }
  
  app.get('/', async (_req, res) => {
    const content = readFileSync(join(root, dir, 'index.html'), 'utf8');
    const injectedContent = modifyHTML(content);
    res.send(injectedContent);
  });
  app.use(staticDir(join(root, dir)));
  
  server.listen(port, () => (window.showInformationMessage(startMessage, { title: 'Dismiss' })));
  // openUrl('http://127.0.0.1:' + port);

  serverRunning = true;
  
  statusButton.setLoading();
}

export function closeServer() {
  server.close();
  sockets.forEach(socket => socket.destroy());
  serverRunning = false;
  statusButton.setDoStart();
}