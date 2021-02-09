import { window, StatusBarAlignment } from 'vscode';
import { START_COMMAND, CLOSE_COMMAND } from './subscriptions';

const button = window.createStatusBarItem(StatusBarAlignment.Left);

const statusButton = {
  load() { this.setDoStart(); button.show() },
  setDoStart() {
    button.text = '$(star-empty) Go Lively';
    button.tooltip = 'Click to start lively server';
    button.command = START_COMMAND;
  },
  setLoading() {
    button.text = '$(star-half) Waiting...';
    button.tooltip = 'Click to close lively server';
    button.command = CLOSE_COMMAND;
  },
  setDoClose() {
    button.text = '$(star-full) Connected';
  },
};

export default statusButton;