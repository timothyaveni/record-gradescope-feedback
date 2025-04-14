// src/background.ts

import { browser } from 'webextension-polyfill-ts';
import { ObsManager } from './obsManager';

const ICON_IDLE = 'dist/icons/icon_idle.png';
const ICON_PENDING = 'dist/icons/icon_pending.png';
const ICON_CHECK = 'dist/icons/icon_check.png';
const ICON_RECORDING = 'dist/icons/icon_recording.png';
const ICON_ERROR = 'dist/icons/icon_error.png';

// The structure we'll store in browser.storage.local
interface ExtensionConfig {
  obsHost: string;
  obsPort: number;
  obsPassword: string;
  urlPattern: string; // e.g. "gradescope\\.com\\/.*\\/submissions\\/(\\d+)"
  filenameTemplate: string; // e.g. "gradescope_submission_$1"
}

// Default config if none is set
const DEFAULT_CONFIG: ExtensionConfig = {
  obsHost: 'localhost',
  obsPort: 4455,
  obsPassword: '',
  urlPattern: 'submissions\/(\\d+)\/grade',
  filenameTemplate: 'gradescope_submission_$1',
};

const obsManager = new ObsManager();

// Simple state flags
let connectionError = false;
let pending = false; // e.g. "connecting to OBS" or "setting param" moment
let lastSetFilename = '';
let lastDetectedFilename = '';

// Start by reading config and try connecting
init();

async function init() {
  const config = await loadConfig();
  try {
    if (config.obsHost && config.obsPort) {
      pending = true;
      updateIcon();
      await obsManager.connect({
        host: config.obsHost,
        port: config.obsPort,
        password: config.obsPassword,
      });
      connectionError = false;
      pending = false;
      updateIcon();
    }
  } catch (err) {
    console.error('Failed to connect OBS', err);
    connectionError = true;
    pending = false;
    updateIcon();
  }

  // Listen for tab updates
  browser.tabs.onUpdated.addListener(
    async (tabId, changeInfo, tab) => {
      // We only care if the URL changed or is loaded
      if (changeInfo.status === 'complete' || changeInfo.url) {
        if (tab.url) {
          onUrlVisited(tab.url);
        }
      }
    },
    { urls: ['<all_urls>'] }
  );

  // Listen for record-state changes from ObsManager
  obsManager.onRecordStateChanged((recording, data) => {
    updateIcon();
  });

  // Listen for connection errors
  obsManager.onConnectionError((err) => {
    connectionError = true;
    updateIcon();
  });

  // Listen for messages from popup
  browser.runtime.onMessage.addListener(onMessage);
}

function updateIcon() {
  let icon = ICON_IDLE;

  // Priority: error -> recording -> pending -> check (if we set something) -> idle
  if (connectionError) {
    icon = ICON_ERROR;
  } else if (obsManager.isRecording()) {
    icon = ICON_RECORDING;
  } else if (pending) {
    icon = ICON_PENDING;
  } else if (lastSetFilename) {
    icon = ICON_CHECK;
  }

  browser.action.setIcon({ path: icon });
}

async function onUrlVisited(urlString: string) {
  const config = await loadConfig();
  if (!config.urlPattern || !config.filenameTemplate) return;
  if (!obsManager.isObsConnected()) return;

  const regex = new RegExp(config.urlPattern);
  const match = urlString.match(regex);
  if (match) {
    // Construct the new filename from the template
    // e.g. "gradescope_submission_$1"
    let newFilename = config.filenameTemplate;
    // Replace $1, $2, etc.
    match.forEach((group, idx) => {
      if (idx > 0) {
        newFilename = newFilename.replace(`$${idx}`, group);
      }
    });

    try {
      pending = true;
      updateIcon();
      await obsManager.setFilenameParameter(newFilename);
      lastSetFilename = newFilename;
      lastDetectedFilename = newFilename;
      pending = false;

      // Double-check it by re-querying
      await obsManager.cacheFilenameInfo();
      updateIcon();
    } catch (err) {
      console.error('Failed to set filename param', err);
      connectionError = true;
      pending = false;
      updateIcon();
    }
  }
}

// Handle messages from the popup (and possibly from the options page)
async function onMessage(message: any, sender: any) {
  console.log('BG got message', message);

  switch (message.type) {
    case 'getStatus': {
      return {
        connected: obsManager.isObsConnected(),
        recording: obsManager.isRecording(),
        currentFilename: obsManager.getCurrentFilename(),
        defaultFilename: obsManager.getDefaultFilename(),
        connectionError,
        lastSetFilename,
        detectedFilename: lastDetectedFilename,
      };
    }
    case 'startRecording':
      if (obsManager.isObsConnected()) {
        return obsManager.startRecording();
      }
      break;
    case 'stopRecording':
      if (obsManager.isObsConnected()) {
        return obsManager.stopRecording();
      }
      break;
    case 'retryObsConnection':
      await reconnect();
      break;
    case 'resetFilename':
      if (obsManager.isObsConnected()) {
        pending = true;
        updateIcon();
        return obsManager.resetToDefaultFilename().then(() => {
          lastSetFilename = '';
          pending = false;
          obsManager.cacheFilenameInfo().then(() => {
            updateIcon();
          });
        });
      }
      break;
    case 'updateConfig':
      // Reconnect logic or store only?
      await saveConfig(message.config);
      await reconnect();
      break;
    default:
      break;
  }
  return undefined;
}

async function reconnect() {
  connectionError = false;
  pending = true;
  updateIcon();
  try {
    const config = await loadConfig();
    await obsManager.connect({
      host: config.obsHost,
      port: config.obsPort,
      password: config.obsPassword,
    });
    pending = false;
  } catch (err) {
    connectionError = true;
    pending = false;
  }
  updateIcon();
}

async function loadConfig(): Promise<ExtensionConfig> {
  const stored = await browser.storage.local.get('obsConfig');
  const config: ExtensionConfig = stored.obsConfig || {};
  return {
    obsHost: config.obsHost ?? DEFAULT_CONFIG.obsHost,
    obsPort: config.obsPort ?? DEFAULT_CONFIG.obsPort,
    obsPassword: config.obsPassword ?? DEFAULT_CONFIG.obsPassword,
    urlPattern: config.urlPattern ?? DEFAULT_CONFIG.urlPattern,
    filenameTemplate:
      config.filenameTemplate ?? DEFAULT_CONFIG.filenameTemplate,
  };
}

async function saveConfig(config: ExtensionConfig) {
  await browser.storage.local.set({ obsConfig: config });
}
