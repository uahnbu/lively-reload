import { start } from 'repl';
import { commands } from 'vscode';
import { closeServer, startServer } from '../../server';

export const START_COMMAND = 'lively-reload.startLively';
export const CLOSE_COMMAND = 'lively-reload.closeLively';

const subscriptions = [
  commands.registerCommand(START_COMMAND, () => startServer()),
  commands.registerCommand(CLOSE_COMMAND, () => closeServer())
];

export default subscriptions;