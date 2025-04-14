// src/options.ts
import { browser } from 'webextension-polyfill-ts';

const obsHostEl = document.getElementById('obsHost') as HTMLInputElement;
const obsPortEl = document.getElementById('obsPort') as HTMLInputElement;
const obsPasswordEl = document.getElementById(
  'obsPassword'
) as HTMLInputElement;
const urlPatternEl = document.getElementById('urlPattern') as HTMLInputElement;
const filenameTemplateEl = document.getElementById(
  'filenameTemplate'
) as HTMLInputElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLDivElement;

const patternWithAITextarea = document.getElementById(
  'patternWithAI'
) as HTMLTextAreaElement;
const setPatternWithAIBtn = document.getElementById(
  'setPatternWithAI'
) as HTMLButtonElement;

interface ExtensionConfig {
  obsHost: string;
  obsPort: number;
  obsPassword: string;
  urlPattern: string;
  filenameTemplate: string;
}

async function loadConfig(): Promise<ExtensionConfig> {
  const stored = await browser.storage.local.get('obsConfig');
  const config = stored.obsConfig || {};
  return {
    obsHost: config.obsHost ?? 'localhost',
    obsPort: config.obsPort ?? 4455,
    obsPassword: config.obsPassword ?? '',
    urlPattern: config.urlPattern ?? 'submissions\/(\\d+)\/grade',
    filenameTemplate: config.filenameTemplate ?? 'gradescope_submission_$1',
  };
}

async function saveConfig() {
  const config: ExtensionConfig = {
    obsHost: obsHostEl.value,
    obsPort: parseInt(obsPortEl.value, 10),
    obsPassword: obsPasswordEl.value,
    urlPattern: urlPatternEl.value,
    filenameTemplate: filenameTemplateEl.value,
  };

  // Save it to storage
  await browser.runtime.sendMessage({
    type: 'updateConfig',
    config,
  });

  statusEl.textContent = 'Saved! Attempted reconnect to OBS with new settings.';
}

async function init() {
  const config = await loadConfig();
  obsHostEl.value = config.obsHost;
  obsPortEl.value = config.obsPort.toString();
  obsPasswordEl.value = config.obsPassword;
  urlPatternEl.value = config.urlPattern;
  filenameTemplateEl.value = config.filenameTemplate;

  saveBtn.addEventListener('click', saveConfig);

  setPatternWithAIBtn.addEventListener('click', async () => {
    setPatternWithAIBtn.disabled = true;

    const response = await fetch('https://noggin.rea.gent/cute-mongoose-3536', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer rg_v1_m29pbu65zgf4bhjo6o1uxjg6qy8f3ltk0rg6_ngk',
      },
      body: JSON.stringify({
        request: patternWithAITextarea.value,
      }),
    }).then((response) => response.json());

    setPatternWithAIBtn.disabled = false;

    urlPatternEl.value = response.urlPattern;
    filenameTemplateEl.value = response.filenameTemplate;
  });
}

init();
