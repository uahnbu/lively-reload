import { commands, ExtensionContext } from 'vscode';
import { startServer, closeServer } from '../../server';

export const START_COMMAND = 'lively-reload.startLively';
export const CLOSE_COMMAND = 'lively-reload.closeLively';

const subscriptions = [
  commands.registerCommand(START_COMMAND, () => startServer()),
  commands.registerCommand(CLOSE_COMMAND, () => closeServer())
];

export function subscribe(context: ExtensionContext) {
  context.subscriptions.push(...subscriptions);
}