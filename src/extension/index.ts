import { ExtensionContext, commands } from 'vscode';
import { startServer, closeServer, reloadServer } from '../server';
import statusButton from './utils/statusButton';

export { statusButton };

export { getRoot, getConfig, getActiveFile } from './utils/commands';

export const START_COMMAND = 'livelyReload.startLively';
export const CLOSE_COMMAND = 'livelyReload.closeLively';

const RELOAD_COMMAND = 'livelyReload.reloadLively';

export function activate(context: ExtensionContext) {
	statusButton.load();
	const subscriptions = [
		commands.registerCommand(START_COMMAND, () => startServer()),
		commands.registerCommand(CLOSE_COMMAND, () => closeServer()),
		commands.registerCommand(RELOAD_COMMAND, () => reloadServer())
	];
	context.subscriptions.push(...subscriptions);
}

`╭───────╮
 │   *   │
 ╰───────╯`

// TODO: Add configs for typescript (target, module)
// TODO: Add error msg for each compiler; Add info msg when no root
 
// DONE: Read configs from package.json
// DONE: Read changed content instead of file
// DONE: Add badge for current file, serve another file on change
// DONE: Watch multiple websockets
// DONE: Listen to file change only when server started
// DONE: Multiple workspaceFolders check

// FIXME: 1st typed char of div not rendered since DiffDOM can't identify corresponding div --> type 2 chars + Backspace
// FIXME: Iframe sometimes doesn't load
// FIXME: Server letting unused for a long time generates errors (Failed to load message bundle for file /index)