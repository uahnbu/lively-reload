import { window, StatusBarAlignment, ColorThemeKind } from 'vscode';
import { START_COMMAND, CLOSE_COMMAND } from '..';

const button = window.createStatusBarItem(StatusBarAlignment.Left);

// let timer: NodeJS.Timeout;
// let loadingStage: number;

export function loadStatusButton() {
  setStatusButtonDoStart();
  button.show();
}

export function setStatusButtonDoStart() {
  button.text = '$(vm) Lively Reload';
  button.color = '#fff'
  button.tooltip = 'Click to start lively server';
  button.command = START_COMMAND;
  // clearInterval(timer);
}

export function setStatusButtonLoading() {
  button.text = '$(vm-active) Lively Reload';
  button.color = isDarkTheme() ? '#0af' : '#09e';
  button.tooltip = 'Click to close lively server';
  button.command = CLOSE_COMMAND;
  // loadingStage = 0;
  // timer = setInterval(animateLoading, 100);
}

export function setStatusButtonDoClose() {
  button.text = '$(vm-running) Lively Reload';
  button.color = isDarkTheme() ? '#4c3' : '#4b3';
  // loadingStage = -1;
  // clearInterval(timer);
}

function isDarkTheme() {
  return window.activeColorTheme.kind === ColorThemeKind.Dark;
}

// function animateLoading() {
//   const loadingStyle = ['🌒','🌓','🌔','🌕','🌖','🌗','🌘','🌑'];
//   button.text = loadingStyle[loadingStage] + ' Lively Reload';
//   ++loadingStage === loadingStyle.length && (loadingStage = 0);
// }