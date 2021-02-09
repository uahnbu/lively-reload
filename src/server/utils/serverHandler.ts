import { window, workspace } from 'vscode';
import { Server } from 'http';
import { Socket } from 'net';
import { Express, static as staticDir } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { statusButton, openUrl } from '../../extension';
import modifyHTML from './modifyHTML';

const configs = workspace.getConfiguration('lively-reload');

export default class ServerEvents {
  app: Express
  server: Server
  sockets: Set<Socket>

  constructor(app: Express, server: Server, sockets: Set<Socket>) {
    this.app = app;
    this.server = server;
    this.sockets = sockets;
  }

  startServer() {
    const [port, dir] = ['port', 'dir'].map(prop => configs.get(prop));
    const root = workspace.workspaceFolders?.[0].uri.fsPath;
    const startMessage = 'Server started on 127.0.0.1:' + port + '.';

    if (!root) { window.showErrorMessage('No directory found.'); return }
    
    this.app.get('/', async (_req, res) => {
      const content = readFileSync(join(root, dir, 'index.html'), 'utf8');
      const injectedContent = modifyHTML(content);
      res.send(injectedContent);
    });
    this.app.use(staticDir(join(root, dir)));
    
    this.server.listen(port, () => (window.showInformationMessage(startMessage, { title: 'Dismiss' })));
    // openUrl('http://127.0.0.1:' + port);

    statusButton.setLoading();
  }

  closeServer() {
    this.server.close();
    this.sockets.forEach(socket => socket.destroy());
    setTimeout(() => console.log(this.sockets), 2000);
    statusButton.setDoStart();
  }
}