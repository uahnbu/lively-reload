import { ExtensionContext, window, workspace } from 'vscode';
import { editorOnChange, editorOnSave } from './utils/editor';
import statusButton from './utils/statusButton';
import subscriptions from './utils/subscriptions';

export { openUrl } from './utils/cmd';

export { statusButton, subscriptions };

export function activate(context: ExtensionContext) {
	statusButton.load();
	workspace.onDidChangeTextDocument(editorOnChange);
	workspace.onDidSaveTextDocument(editorOnSave);
	for (const subscription of subscriptions) { context.subscriptions.push(subscription) }
}

`╭───────╮
 │   *   │
 ╰───────╯`