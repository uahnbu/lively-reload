import { ExtensionContext, commands } from 'vscode';
import { listenEditorEvents } from '../editor';
import { startServer, closeServer, reloadServer } from '../server';
import statusButton from './utils/statusButton';

export { statusButton };

export {
	showMessage,
	getRoot,
	getPacker,
	getActiveHtmlData,
	getConfig,
	openBrowser,
	focusContent
} from './utils/commands';

export const START_COMMAND = 'livelyReload.startLively';
export const CLOSE_COMMAND = 'livelyReload.closeLively';

const RELOAD_COMMAND = 'livelyReload.reloadLively';

export function activate(context: ExtensionContext) {
	statusButton.load();
	context.subscriptions.push(...[
		commands.registerCommand(START_COMMAND, () => startServer()),
		commands.registerCommand(CLOSE_COMMAND, () => closeServer()),
		commands.registerCommand(RELOAD_COMMAND, () => reloadServer())
	]);
	listenEditorEvents();
}

`.        ╭───────╮
  From VN │   *   │ with ❤.
          ╰───────╯         `