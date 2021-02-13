import { ExtensionContext, window, workspace } from 'vscode';
import { editorOnChange, editorOnSave, activeFileOnChange } from './utils/handleEditor';
import { subscribe } from './utils/subscriptions';
import statusButton from './utils/statusButton';

export { START_COMMAND, CLOSE_COMMAND } from './utils/subscriptions';
export { getRoot, modifyHTML } from './utils/handleEditor';
export { statusButton };

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

// TODO: Read configs from package.json
// TODO: Validate HTML before send
 
// DONE: If activeHTML, serve, else if index.html, serve, else show error
// DONE: Read changed content instead of file
// DONE: Add badge for current file, serve another file on change
// DONE: Maybe move modifyHTML to extension/utils
// DONE: Rename contentdocument, documentelement, etc.
// DONE: Restructure code: classes -> objects/functions, add $ prefix for private variables
// DONE: Watch multiple websockets
// DONE: Listen to file change only when server started
// DONE: Multiple workspaceFolders check

// FIXME: 1st typed char of div not rendered since DiffDOM can't identify corresponding div --> type 2 chars + Backspace
// FIXME: Iframe sometimes doesn't load
// FIXME: Server letting unused for a long time generates errors