/**
 * Centralized Path Resolution Module
 * Handles storage paths for both development and packaged (production) modes
 */

import { app } from 'electron';
import path from 'path';
import fs from 'fs';

/**
 * Determines if the app is running in packaged (production) mode
 */
export function isPackaged(): boolean {
  return app.isPackaged;
}

/**
 * Returns the root directory for user data storage
 * - Development: project_root/storage
 * - Production: AppData/research-article-manager (Win) or ~/Library/Application Support/research-article-manager (Mac)
 */
export function getStorageRoot(): string {
  if (isPackaged()) {
    // Use Electron's userData path which is:
    // Windows: %APPDATA%/research-article-manager
    // macOS: ~/Library/Application Support/research-article-manager
    return app.getPath('userData');
  } else {
    // Development: use project directory
    return path.join(process.cwd(), 'storage');
  }
}

/**
 * Specific storage paths - use getters to ensure paths are resolved at access time
 */
export const StoragePaths = {
  get database(): string {
    return path.join(getStorageRoot(), 'database');
  },
  get databaseFile(): string {
    return path.join(this.database, 'articles.db');
  },
  get pdfs(): string {
    return path.join(getStorageRoot(), 'pdfs');
  },
  get notes(): string {
    return path.join(getStorageRoot(), 'notes');
  },
  get root(): string {
    return getStorageRoot();
  }
};

/**
 * Returns path to bundled resources (templates, etc.)
 * - Development: webpack output directory (.webpack/main/templates)
 * - Production: resources/templates (via extraResource in forge.config)
 */
export function getTemplatePath(templateName: string): string {
  if (isPackaged()) {
    // In packaged app, extraResource puts templates in resources/templates
    return path.join(process.resourcesPath, 'templates', templateName);
  } else {
    // Development: templates are copied to .webpack/main/templates by CopyWebpackPlugin
    return path.join(__dirname, 'templates', templateName);
  }
}

/**
 * Ensures all required storage directories exist
 * Call this early in app initialization, AFTER app 'ready' event
 */
export function ensureStorageDirectories(): void {
  const dirs = [
    StoragePaths.root,
    StoragePaths.database,
    StoragePaths.pdfs,
    StoragePaths.notes
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }

  console.log(`Storage root: ${StoragePaths.root}`);
  console.log(`App is packaged: ${isPackaged()}`);
}
