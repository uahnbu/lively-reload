import { IncomingMessage, createServer } from 'http';
import { Socket } from 'net';
import * as express from 'express';
import { initServerHandler } from './utils/handleServer';
import { handleConnection } from './utils/websocket';

const app = express();
const server = createServer(app);
const sockets = new Set<Socket>();

initServerHandler(app, server, sockets);

server.on('connection', socket => (sockets.add(socket), socket.once('close', () => sockets.delete(socket))));
server.on('upgrade', (...args: [IncomingMessage, Socket, Buffer]) => handleConnection(...args));

export { isServerRunning, startServer, closeServer } from './utils/handleServer';
export { default as modifyHTML } from './utils/modifyHTML';
export { getRoot } from './utils/getInitFile';
export { sendMessage } from './utils/websocket';