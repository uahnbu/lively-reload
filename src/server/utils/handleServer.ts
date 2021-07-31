import { Server } from 'http';
import { Socket } from 'net';
import { Express } from 'express';

let app: Express, server: Server, sockets: Set<Socket>;
let serverRunning = false;

export function isServerRunning() { return serverRunning }
export function initServerHandler(
  myApp: Express,
  myServer: Server,
  mySockets: Set<Socket>
) { app = myApp, server = myServer, sockets = mySockets }

export async function reloadServer() {
  const { sendMessage } = await import('./websocket');
  sendMessage('reloadFull');
}

export async function startServer() {
  const { join } = await import('path');
  const { static: staticDir } = await import('express');
  const {
    getRoot, getConfig, statusButton,
    openBrowser, showMessage
  } = await import('../../extension');
  const { resurrect } = await import('./websocket');
  const port = await getConfig('port');
  const root = getRoot();
  app.use(staticDir(join(__dirname, 'static')));
  root && app.use(staticDir(root));
  openBrowser('http://127.0.0.1:' + port);
  server.listen(port, () => showMessage(
    'Server started on http://127.0.0.1:' + port + '.',
    'info'
  ));
  server.once('error', ({code}: { code: string }) => {
    showMessage('Server error: ' + code, 'error');
    closeServer();
  })
  serverRunning = true;
  resurrect();
  statusButton.setLoading();
}

export async function closeServer() {
  const { statusButton } = await import('../../extension');
  const { killHeart } = await import('./websocket');
  killHeart();
  server.close();
  serverRunning = false;
  sockets.forEach(socket => socket.destroy());
  statusButton.setDoStart();
}