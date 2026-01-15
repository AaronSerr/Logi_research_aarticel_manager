/**
 * IPC Handlers for Database operations
 * Handles database statistics, optimization, export/import
 */

import { ipcMain } from 'electron';
import { getDb } from '../database';

// Get database statistics
ipcMain.handle('database:getStats', async () => {
  try {
    const db = getDb();
    const articlesCount = db.prepare(`SELECT COUNT(*) as count FROM Article`).get() as { count: number };
    const authorsCount = db.prepare(`SELECT COUNT(*) as count FROM Author`).get() as { count: number };
    const keywordsCount = db.prepare(`SELECT COUNT(*) as count FROM Keyword`).get() as { count: number };
    const subjectsCount = db.prepare(`SELECT COUNT(*) as count FROM Subject`).get() as { count: number };
    const tagsCount = db.prepare(`SELECT COUNT(*) as count FROM Tag`).get() as { count: number };
    const universitiesCount = db.prepare(`SELECT COUNT(*) as count FROM University`).get() as { count: number };
    const companiesCount = db.prepare(`SELECT COUNT(*) as count FROM Company`).get() as { count: number };
    const readCount = db.prepare(`SELECT COUNT(*) as count FROM Article WHERE read = 1`).get() as { count: number };
    const favoriteCount = db.prepare(`SELECT COUNT(*) as count FROM Article WHERE favorite = 1`).get() as { count: number };

    // Get average rating
    const avgRating = db.prepare(`SELECT AVG(rating) as avg FROM Article`).get() as { avg: number | null };

    return {
      articles: articlesCount.count,
      authors: authorsCount.count,
      keywords: keywordsCount.count,
      subjects: subjectsCount.count,
      tags: tagsCount.count,
      universities: universitiesCount.count,
      companies: companiesCount.count,
      read: readCount.count,
      favorites: favoriteCount.count,
      averageRating: avgRating.avg || 0,
    };
  } catch (error) {
    console.error('Error getting database stats:', error);
    throw error;
  }
});

// Optimize database (VACUUM)
ipcMain.handle('database:optimize', async () => {
  try {
    const db = getDb();
    // Run VACUUM to optimize SQLite database
    db.exec('VACUUM');
    console.log('Database optimized');
  } catch (error) {
    console.error('Error optimizing database:', error);
    throw error;
  }
});

// Export database (placeholder - to be implemented)
ipcMain.handle('database:export', async (_event, exportPath: string) => {
  try {
    // TODO: Implement database export to JSON
    console.log('Export to:', exportPath);
    throw new Error('Export not yet implemented');
  } catch (error) {
    console.error('Error exporting database:', error);
    throw error;
  }
});

// Import database (placeholder - to be implemented)
ipcMain.handle('database:import', async (_event, importPath: string) => {
  try {
    // TODO: Implement database import from JSON
    console.log('Import from:', importPath);
    throw new Error('Import not yet implemented');
  } catch (error) {
    console.error('Error importing database:', error);
    throw error;
  }
});
