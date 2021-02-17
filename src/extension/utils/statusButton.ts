import { window, StatusBarAlignment } from 'vscode';
import { START_COMMAND, CLOSE_COMMAND } from '..';

const button = window.createStatusBarItem(StatusBarAlignment.Left);

let timer: NodeJS.Timeout;
let loadingStage: number;

const statusButton = {
  load() { this.setDoStart(); button.show() },
  setDoStart() {
    button.text = '$(smiley) Lively Reload';
    button.tooltip = 'Click to start lively server';
    button.command = START_COMMAND;
    clearInterval(timer);
  },
  setLoading() {
    loadingStage = 0;
    timer = setInterval(animateLoading, 300);
    button.tooltip = 'Click to close lively server';
    button.command = CLOSE_COMMAND;
  },
  setDoClose() {
    button.text = '$(pass) Lively Reload';
    loadingStage = -1;
    clearInterval(timer);
  },
};

export default statusButton;

function animateLoading() {
  const content = '$(smiley) Lively Reload ';
  const decoration = ['··.', '·..', '..·', '.··', '···', '···'];
  button.text = content + decoration[loadingStage];
  ++loadingStage === 6 && (loadingStage = 0);
}

// function animateLoading2() {
//   const content = '$(star-half) Lively';
//   const decoration = String.fromCharCode(0x035E, 0x035F);
//   const loadingOriented = loadingStage > 6 && 13 - loadingStage || loadingStage;
//   $button.text = content.slice(0, 13 + loadingOriented) + decoration + content.slice(13 + loadingOriented);
//   loadingStage++ === 12 && (loadingStage = 1);
// }