import { ExtensionContext, workspace } from 'vscode';
import { editorOnChange, editorOnSave } from './utils/editorHandler';
import { START_COMMAND, CLOSE_COMMAND, subscribe } from './utils/subscriptions';
import statusButton from './utils/statusButton';

export { openUrl } from './utils/cmd';

export { statusButton, START_COMMAND, CLOSE_COMMAND };

export function activate(context: ExtensionContext) {
	statusButton.load();
	workspace.onDidChangeTextDocument(editorOnChange);
	workspace.onDidSaveTextDocument(editorOnSave);
	subscribe(context);
}

`╭───────╮
 │   *   │
 ╰───────╯`

// TODO: Read changed content instead of file
// TODO: Store changed file in an Array
// TODO: Listen to file change on Socket started only
// TODO: Multiple workspaceFolders check
// TODO: Which this is the "this" in bind(this)