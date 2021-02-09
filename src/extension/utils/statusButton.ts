import { window, StatusBarAlignment } from 'vscode';
import { START_COMMAND, CLOSE_COMMAND } from './subscriptions';

const statusButton = {
  button: window.createStatusBarItem(StatusBarAlignment.Left),
  load() {
    this.setDoStart();
    this.button.show();
  },
  setDoStart() {
    this.button.text = '$(star-empty) Go Lively';
    this.button.tooltip = 'Click to start lively server';
    this.button.command = START_COMMAND;
  },
  setLoading() {
    this.button.text = '$(star-half) Waiting...';
    this.button.tooltip = 'Click to close lively server';
    this.button.command = CLOSE_COMMAND;
  },
  setDoClose() {
    this.button.text = '$(star-full) Connected';
  }
};

export default statusButton;