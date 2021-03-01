import { window } from 'vscode';
import { Server } from 'http';
import { Socket } from 'net';
import { Express, static as staticDir } from 'express';
import { join } from 'path';
import { readFileSync } from 'fs';
import { getConfig, getRoot, statusButton } from '../../extension';
import { sendMessage, resurrect, killHeart } from './websocket';

let app: Express;
let server: Server;
let sockets: Set<Socket>;
let serverRunning = false;

export function isServerRunning() { return serverRunning }
export function initServerHandler(myApp: Express, myServer: Server, mySockets: Set<Socket>) {
  app = myApp, server = myServer, sockets = mySockets;
}

export function reloadServer() { sendMessage('reloadFull') }
export function startServer() {
  const root = getRoot();
  const port = getConfig('port');
  const startMessage = 'Server started on http://127.0.0.1:' + port + '.';
  
  app.get('/', (_req, res) => {
    const html = readFileSync(join(__dirname, '../assets/index.html'), 'utf8');
    const script = '<script>' + readFileSync(join(__dirname, '../assets/index.js'), 'utf8') + '</script>';
    res.send(addAtIndex(html, script, html.indexOf('</body>')));
  });
  root && app.use(staticDir(root));
  
  server.listen(port, () => window.showInformationMessage(startMessage, { title: 'Dismiss' }));
  serverRunning = true;

  // openUrl('http://127.0.0.1:' + port);
  resurrect();
  statusButton.setLoading();
}

export function closeServer() {
  killHeart();
  server.close();
  sockets.forEach(socket => socket.destroy());
  serverRunning = false;
  statusButton.setDoStart();
}

function addAtIndex(str: string, substr: string, index: number) {
  return str.slice(0, index) + substr + str.slice(index);
}