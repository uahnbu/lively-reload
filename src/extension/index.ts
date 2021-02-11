import { ExtensionContext, window, workspace } from 'vscode';
import { editorOnChange, editorOnSave, activeFileOnChange } from './utils/handleEditor';
import { START_COMMAND, CLOSE_COMMAND, subscribe } from './utils/subscriptions';
import statusButton from './utils/statusButton';

export { statusButton, START_COMMAND, CLOSE_COMMAND };

export function activate(context: ExtensionContext) {
	statusButton.load();
	workspace.onDidChangeTextDocument(editorOnChange);
	workspace.onDidSaveTextDocument(editorOnSave);
	window.onDidChangeActiveTextEditor(activeFileOnChange);
	subscribe(context);
}

`╭───────╮
 │   *   │
 ╰───────╯`

// TODO: Read changed content instead of file
// TODO: If activeHTML, serve, else if index.html, serve, else show error
// TODO: Add badge for current file, serve another file on change
// TODO: Read configs from package.json
// TODO: Maybe move modifyHTML to extension/utils

// DONE: Restructure code: classes -> objects/functions, add $ prefix for private variables
// DONE: Watch multiple websockets
// DONE: Listen to file change only when server started
// DONE: Multiple workspaceFolders check

// FIXME: 1st typed char of div not rendered since DiffDOM can't identify corresponding div --> type 2 chars + Backspace