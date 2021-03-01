import { window, StatusBarAlignment } from 'vscode';
import { START_COMMAND, CLOSE_COMMAND } from '..';

const button = window.createStatusBarItem(StatusBarAlignment.Left);

let timer: NodeJS.Timeout;
let loadingStage: number;

const statusButton = {
  load() { this.setDoStart(); button.show() },
  setDoStart() {
    button.text = '🌑 Lively Reload';
    button.tooltip = 'Click to start lively server';
    button.command = START_COMMAND;
    clearInterval(timer);
  },
  setLoading() {
    loadingStage = 0;
    timer = setInterval(animateLoading, 100);
    button.tooltip = 'Click to close lively server';
    button.command = CLOSE_COMMAND;
  },
  setDoClose() {
    button.text = '🌕 Lively Reload';
    loadingStage = -1;
    clearInterval(timer);
  },
};

export default statusButton;

function animateLoading() {
  const loadingStyle = ['🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑'];
  button.text = loadingStyle[loadingStage] + ' Lively Reload';
  ++loadingStage === loadingStyle.length && (loadingStage = 0);
}