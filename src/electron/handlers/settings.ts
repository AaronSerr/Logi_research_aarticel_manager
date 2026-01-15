/**
 * IPC Handlers for Settings operations
 */

import { ipcMain } from 'electron';
import { getDb } from '../database';

// Get user settings
ipcMain.handle('settings:get', async () => {
  try {
    const db = getDb();
    const stmt = db.prepare(`SELECT * FROM UserSettings LIMIT 1`);
    let settings = stmt.get() as any;

    // Create default settings if none exist
    if (!settings) {
      const insertStmt = db.prepare(`
        INSERT INTO UserSettings (theme, language, fontSize, pdfViewer)
        VALUES (?, ?, ?, ?)
      `);
      insertStmt.run('light', 'English', 14, 'system');

      settings = stmt.get();
    }

    return settings;
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
});

// Update user settings
ipcMain.handle('settings:update', async (_event, newSettings: any) => {
  try {
    const db = getDb();
    const existingStmt = db.prepare(`SELECT id FROM UserSettings LIMIT 1`);
    const existing = existingStmt.get() as { id: number } | undefined;

    let settings;
    if (existing) {
      // Update existing settings
      const updates: string[] = [];
      const values: any[] = [];

      if (newSettings.theme !== undefined) {
        updates.push('theme = ?');
        values.push(newSettings.theme);
      }
      if (newSettings.language !== undefined) {
        updates.push('language = ?');
        values.push(newSettings.language);
      }
      if (newSettings.fontSize !== undefined) {
        updates.push('fontSize = ?');
        values.push(newSettings.fontSize);
      }
      if (newSettings.pdfViewer !== undefined) {
        updates.push('pdfViewer = ?');
        values.push(newSettings.pdfViewer);
      }

      updates.push('updatedAt = datetime("now")');
      values.push(existing.id);

      const updateStmt = db.prepare(`UPDATE UserSettings SET ${updates.join(', ')} WHERE id = ?`);
      updateStmt.run(...values);

      const selectStmt = db.prepare(`SELECT * FROM UserSettings WHERE id = ?`);
      settings = selectStmt.get(existing.id);
    } else {
      // Create new settings
      const insertStmt = db.prepare(`
        INSERT INTO UserSettings (theme, language, fontSize, pdfViewer)
        VALUES (?, ?, ?, ?)
      `);
      const result = insertStmt.run(
        newSettings.theme || 'light',
        newSettings.language || 'English',
        newSettings.fontSize || 14,
        newSettings.pdfViewer || 'system'
      );

      const selectStmt = db.prepare(`SELECT * FROM UserSettings WHERE id = ?`);
      settings = selectStmt.get(result.lastInsertRowid);
    }

    return settings;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
});
