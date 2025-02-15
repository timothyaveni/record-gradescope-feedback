// src/obsManager.ts

import { OBSWebSocket, EventSubscription } from 'obs-websocket-js';

export interface ObsConnectionConfig {
  host: string; // e.g. "localhost"
  port: number; // e.g. 4455
  password: string; // e.g. "mypassword"
}

export class ObsManager {
  private obs: OBSWebSocket | null = null;
  private isConnected = false;
  private defaultFilename = '';
  private currentFilename = '';
  private recording = false;

  // Observers/callbacks
  private recordStateCallback?: (recording: boolean, data: any) => void;
  private connectionErrorCallback?: (err: any) => void;

  constructor() {
    // ...
  }

  public async connect(config: ObsConnectionConfig): Promise<void> {
    if (this.obs) {
      // Already have an instance; disconnect first
      await this.disconnect();
    }

    this.obs = new OBSWebSocket();

    try {
      await this.obs.connect(
        `ws://${config.host}:${config.port}`,
        config.password,
        {
          // (Optional) events you want to subscribe to.
          // By default, 'RecordStateChanged' is under 'general' or 'outputs'.
          eventSubscriptions: EventSubscription.All,
        }
      );

      this.isConnected = true;

      // Register the record-state listener
      this.obs.on('RecordStateChanged', (data: any) => {
        this.recording = data.outputActive ?? false;
        if (this.recordStateCallback) {
          this.recordStateCallback(this.recording, data);
        }
      });

      // Read the default/current filename right away
      await this.cacheFilenameInfo();
    } catch (err) {
      console.error('OBS WebSocket connect error', err);
      this.isConnected = false;
      this.obs = null;
      if (this.connectionErrorCallback) {
        this.connectionErrorCallback(err);
      }
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.obs) {
      try {
        await this.obs.disconnect();
      } catch (err) {
        console.warn('Error while disconnecting OBS', err);
      }
      this.obs = null;
      this.isConnected = false;
    }
  }

  public onRecordStateChanged(cb: (recording: boolean, data: any) => void) {
    this.recordStateCallback = cb;
  }

  public onConnectionError(cb: (err: any) => void) {
    this.connectionErrorCallback = cb;
  }

  public isObsConnected(): boolean {
    return this.isConnected;
  }

  public isRecording(): boolean {
    return this.recording;
  }

  public getDefaultFilename(): string {
    return this.defaultFilename;
  }

  public getCurrentFilename(): string {
    return this.currentFilename;
  }

  public async setFilenameParameter(value: string): Promise<void> {
    if (!this.obs) return;
    await this.obs.call('SetProfileParameter', {
      parameterCategory: 'Output',
      parameterName: 'FilenameFormatting',
      parameterValue: value,
    });
    this.currentFilename = value;
  }

  public async resetToDefaultFilename(): Promise<void> {
    if (!this.obs) return;
    // set to default
    await this.setFilenameParameter(this.defaultFilename);
  }

  public async cacheFilenameInfo(): Promise<void> {
    if (!this.obs) return;

    // Get *current* parameter value
    const { parameterValue, defaultParameterValue } = await this.obs.call(
      'GetProfileParameter',
      {
        parameterCategory: 'Output',
        parameterName: 'FilenameFormatting',
      }
    );

    this.defaultFilename = defaultParameterValue;
    this.currentFilename = parameterValue;
  }

  public async startRecording() {
    if (!this.obs) return;
    await this.obs.call('StartRecord');
  }

  public async stopRecording() {
    if (!this.obs) return;
    await this.obs.call('StopRecord');
  }
}
