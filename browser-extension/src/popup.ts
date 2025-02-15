import { browser } from 'webextension-polyfill-ts';

const statusEl = document.getElementById('status') as HTMLDivElement;
const filenameEl = document.getElementById('filename') as HTMLDivElement;

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const stopBtn = document.getElementById('stopBtn') as HTMLButtonElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const settingsBtn = document.getElementById('settingsBtn') as HTMLButtonElement;

async function refreshStatus() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'getStatus' });
    if (!response) return;

    if (response.connectionError) {
      statusEl.textContent = 'OBS: Connection Error';
    } else if (!response.connected) {
      statusEl.textContent = 'OBS: Not connected';
    } else {
      const recStr = response.recording ? 'Recording' : 'Not recording';
      statusEl.textContent = `OBS: Connected, ${recStr}`;
    }

    if (response.currentFilename) {
      filenameEl.textContent = `Filename: ${response.currentFilename}`;
    } else {
      filenameEl.textContent = `Filename: (none?)`;
    }
  } catch (err) {
    console.error('popup: getStatus error', err);
    statusEl.textContent = 'Error retrieving status';
  }
}

async function startRecording() {
  await browser.runtime.sendMessage({ type: 'startRecording' });
}

async function stopRecording() {
  await browser.runtime.sendMessage({ type: 'stopRecording' });
}

async function resetFilename() {
  await browser.runtime.sendMessage({ type: 'resetFilename' });
}

async function openSettings() {
  await browser.runtime.openOptionsPage();
}

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
resetBtn.addEventListener('click', resetFilename);
settingsBtn.addEventListener('click', openSettings);

setInterval(refreshStatus, 100);
