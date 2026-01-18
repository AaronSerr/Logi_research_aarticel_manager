/**
 * Preload script - IPC Bridge between Renderer and Main process
 * This script runs in the renderer process but has access to Node APIs
 * It exposes a secure API to the renderer via contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import { Article, ArticleFormData } from './types/article';

// Define the API that will be exposed to the renderer
const electronAPI = {
  // Article CRUD operations
  articles: {
    getAll: (): Promise<Article[]> => ipcRenderer.invoke('articles:getAll'),
    getById: (id: string): Promise<Article | null> => ipcRenderer.invoke('articles:getById', id),
    create: (formData: ArticleFormData): Promise<Article> => ipcRenderer.invoke('articles:create', formData),
    update: (id: string, formData: Partial<ArticleFormData>): Promise<Article> => ipcRenderer.invoke('articles:update', id, formData),
    delete: (id: string): Promise<void> => ipcRenderer.invoke('articles:delete', id),
  },

  // File operations
  files: {
    uploadPdf: (articleId: string, articleTitle: string, fileBuffer: ArrayBuffer): Promise<string> =>
      ipcRenderer.invoke('files:uploadPdf', articleId, articleTitle, fileBuffer),
    openPdf: (articleId: string): Promise<void> => ipcRenderer.invoke('files:openPdf', articleId),
    getPdfPath: (articleId: string): Promise<string | null> => ipcRenderer.invoke('files:getPdfPath', articleId),
    getPdfBase64: (articleId: string): Promise<string | null> => ipcRenderer.invoke('files:getPdfBase64', articleId),
    openNote: (articleId: string): Promise<void> => ipcRenderer.invoke('files:openNote', articleId),
    generateNote: (article: Article): Promise<void> => ipcRenderer.invoke('files:generateNote', article),
    openUrl: (url: string): Promise<void> => ipcRenderer.invoke('files:openUrl', url),
    migrateFileNames: (): Promise<{success: boolean; migratedPdfs: number; migratedNotes: number; totalArticles: number; errors?: string[]}> =>
      ipcRenderer.invoke('files:migrateFileNames'),
  },

  // Settings operations
  settings: {
    get: (): Promise<any> => ipcRenderer.invoke('settings:get'),
    update: (settings: any): Promise<void> => ipcRenderer.invoke('settings:update', settings),
  },

  // Database operations
  database: {
    getStats: (): Promise<any> => ipcRenderer.invoke('database:getStats'),
    optimize: (): Promise<void> => ipcRenderer.invoke('database:optimize'),
    export: (path: string): Promise<void> => ipcRenderer.invoke('database:export', path),
    import: (path: string): Promise<void> => ipcRenderer.invoke('database:import', path),
  },

  // Storage operations
  storage: {
    getCurrentPath: (): Promise<string> => ipcRenderer.invoke('storage:getCurrentPath'),
    choosePath: (): Promise<string | null> => ipcRenderer.invoke('storage:choosePath'),
    migrate: (newPath: string): Promise<{success: boolean; message: string}> =>
      ipcRenderer.invoke('storage:migrate', newPath),
    restartApp: (): Promise<void> => ipcRenderer.invoke('storage:restartApp'),
    // External storage operations
    getExternalSettings: (): Promise<{externalStoragePath: string; useExternalStorage: boolean}> =>
      ipcRenderer.invoke('storage:getExternalSettings'),
    chooseExternalPath: (): Promise<string | null> => ipcRenderer.invoke('storage:chooseExternalPath'),
    updateExternalSettings: (settings: {externalStoragePath: string; useExternalStorage: boolean}): Promise<{success: boolean; message: string}> =>
      ipcRenderer.invoke('storage:updateExternalSettings', settings),
    copyToExternal: (externalPath: string): Promise<{success: boolean; message: string; copiedCount: number}> =>
      ipcRenderer.invoke('storage:copyToExternal', externalPath),
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript declaration for the exposed API (to be used in renderer)
export type ElectronAPI = typeof electronAPI;
