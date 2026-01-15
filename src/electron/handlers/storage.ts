/**
 * IPC Handlers for Storage Location operations
 */

import { ipcMain, dialog, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { getDb } from '../database';
import { StoragePaths } from '../paths';

// Get current storage path
ipcMain.handle('storage:getCurrentPath', async () => {
  try {
    const db = getDb();
    const stmt = db.prepare(`SELECT storagePath FROM UserSettings LIMIT 1`);
    const settings = stmt.get() as { storagePath: string | null } | undefined;

    if (settings?.storagePath) {
      return settings.storagePath;
    }

    // Default path - use centralized StoragePaths
    return StoragePaths.root;
  } catch (error) {
    console.error('Error getting storage path:', error);
    return StoragePaths.root;
  }
});

// Get external storage settings
ipcMain.handle('storage:getExternalSettings', async () => {
  try {
    const db = getDb();
    const stmt = db.prepare(`SELECT externalStoragePath, useExternalStorage FROM UserSettings LIMIT 1`);
    const settings = stmt.get() as {
      externalStoragePath: string | null;
      useExternalStorage: number | null;
    } | undefined;

    return {
      externalStoragePath: settings?.externalStoragePath || '',
      useExternalStorage: Boolean(settings?.useExternalStorage),
    };
  } catch (error) {
    console.error('Error getting external storage settings:', error);
    return {
      externalStoragePath: '',
      useExternalStorage: false,
    };
  }
});

// Choose external storage folder
ipcMain.handle('storage:chooseExternalPath', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose External Storage Folder',
      buttonLabel: 'Select Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];

    // Validate that folder is writable
    try {
      const testFile = path.join(selectedPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      throw new Error('Selected folder is not writable. Please choose another location.');
    }

    return selectedPath;
  } catch (error: any) {
    console.error('Error choosing external storage path:', error);
    throw error;
  }
});

// Update external storage settings
ipcMain.handle('storage:updateExternalSettings', async (_event, settings: {
  externalStoragePath: string;
  useExternalStorage: boolean;
}) => {
  try {
    const db = getDb();
    const existingStmt = db.prepare(`SELECT id FROM UserSettings LIMIT 1`);
    const existing = existingStmt.get() as { id: number } | undefined;

    if (existing) {
      const updateStmt = db.prepare(`
        UPDATE UserSettings
        SET externalStoragePath = ?, useExternalStorage = ?, updatedAt = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(settings.externalStoragePath, settings.useExternalStorage ? 1 : 0, existing.id);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO UserSettings (externalStoragePath, useExternalStorage)
        VALUES (?, ?)
      `);
      insertStmt.run(settings.externalStoragePath, settings.useExternalStorage ? 1 : 0);
    }

    // Create subdirectories in external storage if enabled
    if (settings.useExternalStorage && settings.externalStoragePath) {
      const subdirs = ['pdfs', 'notes'];
      for (const subdir of subdirs) {
        const dirPath = path.join(settings.externalStoragePath, subdir);
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
      }
    }

    return { success: true, message: 'External storage settings updated successfully.' };
  } catch (error: any) {
    console.error('Error updating external storage settings:', error);
    throw new Error(`Failed to update settings: ${error.message}`);
  }
});

// Copy existing files to external storage
ipcMain.handle('storage:copyToExternal', async (_event, externalPath: string) => {
  try {
    // Use centralized StoragePaths for current path
    const currentPath = StoragePaths.root;

    console.log(`Copying files from ${currentPath} to ${externalPath}`);

    // Create subdirectories in external location
    const subdirs = ['pdfs', 'notes'];
    for (const subdir of subdirs) {
      const dirPath = path.join(externalPath, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    let copiedCount = 0;

    // Copy files from each subdirectory
    const copyDirectory = (src: string, dest: string) => {
      if (!fs.existsSync(src)) {
        console.log(`Source directory ${src} does not exist, skipping...`);
        return;
      }

      const files = fs.readdirSync(src);
      for (const file of files) {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);

        if (fs.statSync(srcFile).isDirectory()) {
          if (!fs.existsSync(destFile)) {
            fs.mkdirSync(destFile, { recursive: true });
          }
          copyDirectory(srcFile, destFile);
        } else {
          // Only copy if file doesn't exist in destination
          if (!fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
            copiedCount++;
            console.log(`Copied: ${file}`);
          }
        }
      }
    };

    // Copy PDFs and Notes
    for (const subdir of subdirs) {
      const srcDir = path.join(currentPath, subdir);
      const destDir = path.join(externalPath, subdir);
      copyDirectory(srcDir, destDir);
    }

    return {
      success: true,
      message: `Successfully copied ${copiedCount} files to external storage.`,
      copiedCount,
    };
  } catch (error: any) {
    console.error('Error copying to external storage:', error);
    throw new Error(`Copy failed: ${error.message}`);
  }
});

// Choose new storage location
ipcMain.handle('storage:choosePath', async () => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Choose Storage Location',
      buttonLabel: 'Select Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];

    // Validate that folder is writable
    try {
      const testFile = path.join(selectedPath, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      throw new Error('Selected folder is not writable. Please choose another location.');
    }

    return selectedPath;
  } catch (error: any) {
    console.error('Error choosing storage path:', error);
    throw error;
  }
});

// Copy storage to new location
ipcMain.handle('storage:migrate', async (_event, newPath: string) => {
  try {
    // Use centralized StoragePaths for current path
    const currentPath = StoragePaths.root;

    console.log(`Migrating storage from ${currentPath} to ${newPath}`);

    // Create subdirectories in new location
    const subdirs = ['database', 'pdfs', 'notes'];
    for (const subdir of subdirs) {
      const dirPath = path.join(newPath, subdir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Copy files
    const copyDirectory = (src: string, dest: string) => {
      if (!fs.existsSync(src)) {
        console.log(`Source directory ${src} does not exist, skipping...`);
        return;
      }

      const files = fs.readdirSync(src);
      for (const file of files) {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);

        if (fs.statSync(srcFile).isDirectory()) {
          if (!fs.existsSync(destFile)) {
            fs.mkdirSync(destFile, { recursive: true });
          }
          copyDirectory(srcFile, destFile);
        } else {
          fs.copyFileSync(srcFile, destFile);
          console.log(`Copied: ${file}`);
        }
      }
    };

    // Copy each subdirectory
    for (const subdir of subdirs) {
      const srcDir = path.join(currentPath, subdir);
      const destDir = path.join(newPath, subdir);
      copyDirectory(srcDir, destDir);
    }

    // Update settings with new path
    const db = getDb();
    const existingStmt = db.prepare(`SELECT id FROM UserSettings LIMIT 1`);
    const existing = existingStmt.get() as { id: number } | undefined;

    if (existing) {
      const updateStmt = db.prepare(`
        UPDATE UserSettings
        SET storagePath = ?, updatedAt = datetime('now')
        WHERE id = ?
      `);
      updateStmt.run(newPath, existing.id);
    } else {
      const insertStmt = db.prepare(`
        INSERT INTO UserSettings (storagePath)
        VALUES (?)
      `);
      insertStmt.run(newPath);
    }

    console.log('Storage migration completed successfully');

    return {
      success: true,
      message: 'Storage migrated successfully! The application will restart.',
    };
  } catch (error: any) {
    console.error('Error migrating storage:', error);
    throw new Error(`Migration failed: ${error.message}`);
  }
});

// Restart application
ipcMain.handle('storage:restartApp', async () => {
  app.relaunch();
  app.exit(0);
});
