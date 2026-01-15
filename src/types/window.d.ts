/**
 * TypeScript declaration for window.electronAPI
 * This allows TypeScript to recognize the electronAPI object exposed via preload
 */

import { ElectronAPI } from '../preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
