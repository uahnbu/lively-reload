import { IncomingMessage, createServer } from 'http';
import { Socket } from 'net';
import * as express from 'express';
import ServerEvents from './utils/serverHandler';
import WebSocket from './utils/websocket';

const app = express();
const server = createServer(app);
const sockets = new Set<Socket>();
const webSocket = new WebSocket();

server.on('connection', socket => (sockets.add(socket), socket.once('close', () => sockets.delete(socket))));
server.on('upgrade', (...args: [IncomingMessage, Socket, Buffer]) => webSocket.serverUpgrade(...args));

export { default as modifyHTML } from './utils/modifyHTML';

export { webSocket };

const serverEvents = new ServerEvents(app, server, sockets);
export const startServer = () => serverEvents.startServer();
export const closeServer = () => serverEvents.closeServer();