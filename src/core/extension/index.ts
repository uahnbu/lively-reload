import { commands } from 'vscode';
import { listenEditorEvents } from '../editor';
import { startServer, closeServer, reloadServer } from '../server';
import { loadStatusButton } from './utils/statusButton';
import type { ExtensionContext } from 'vscode';

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

export {
  setStatusButtonDoStart,
  setStatusButtonLoading,
  setStatusButtonDoClose
} from './utils/statusButton';

const RELOAD_COMMAND = 'livelyReload.reloadLively';

export function activate(context: ExtensionContext) {
  loadStatusButton();
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