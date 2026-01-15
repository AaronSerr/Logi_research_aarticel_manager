/**
 * SQLite Database Service using better-sqlite3
 * Centralized database connection and query methods
 *
 * Uses lazy initialization to ensure app.getPath() is available (after 'ready' event)
 */

import Database from 'better-sqlite3';
import { StoragePaths } from './paths';

// Database instance - initialized lazily
let db: Database.Database | null = null;

/**
 * Get the database instance
 * Throws if database hasn't been initialized yet
 */
export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first after app ready event.');
  }
  return db;
}

// Export db as a getter for backward compatibility with existing code
// This allows existing code using `db.prepare(...)` to continue working
export { db };

/**
 * Initialize database schema
 * Must be called AFTER app 'ready' event (when app.getPath() is available)
 */
export function initializeDatabase(): Database.Database {
  if (db) {
    console.log('Database already initialized');
    return db;
  }

  const dbPath = StoragePaths.databaseFile;
  console.log(`Initializing database at: ${dbPath}`);

  // Create database connection
  db = new Database(dbPath);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  db.exec(`
    -- Main Article table
    CREATE TABLE IF NOT EXISTS Article (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      abstract TEXT NOT NULL,
      conclusion TEXT,
      year INTEGER NOT NULL,
      date TEXT NOT NULL,
      dateAdded TEXT NOT NULL,
      journal TEXT,
      doi TEXT,
      language TEXT DEFAULT 'English',
      numPages INTEGER DEFAULT 0,
      researchQuestion TEXT,
      methodology TEXT,
      dataUsed TEXT,
      results TEXT,
      limitations TEXT,
      firstImp TEXT,
      notes TEXT,
      comment TEXT,
      rating INTEGER DEFAULT 0,
      read INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      fileName TEXT NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- Authors table
    CREATE TABLE IF NOT EXISTS Author (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    -- Article-Author junction table
    CREATE TABLE IF NOT EXISTS ArticleAuthor (
      articleId TEXT NOT NULL,
      authorId INTEGER NOT NULL,
      PRIMARY KEY (articleId, authorId),
      FOREIGN KEY (articleId) REFERENCES Article(id) ON DELETE CASCADE,
      FOREIGN KEY (authorId) REFERENCES Author(id)
    );

    -- Keywords table
    CREATE TABLE IF NOT EXISTS Keyword (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    -- Article-Keyword junction table
    CREATE TABLE IF NOT EXISTS ArticleKeyword (
      articleId TEXT NOT NULL,
      keywordId INTEGER NOT NULL,
      PRIMARY KEY (articleId, keywordId),
      FOREIGN KEY (articleId) REFERENCES Article(id) ON DELETE CASCADE,
      FOREIGN KEY (keywordId) REFERENCES Keyword(id)
    );

    -- Subjects table
    CREATE TABLE IF NOT EXISTS Subject (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    -- Article-Subject junction table
    CREATE TABLE IF NOT EXISTS ArticleSubject (
      articleId TEXT NOT NULL,
      subjectId INTEGER NOT NULL,
      PRIMARY KEY (articleId, subjectId),
      FOREIGN KEY (articleId) REFERENCES Article(id) ON DELETE CASCADE,
      FOREIGN KEY (subjectId) REFERENCES Subject(id)
    );

    -- Tags table
    CREATE TABLE IF NOT EXISTS Tag (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    -- Article-Tag junction table
    CREATE TABLE IF NOT EXISTS ArticleTag (
      articleId TEXT NOT NULL,
      tagId INTEGER NOT NULL,
      PRIMARY KEY (articleId, tagId),
      FOREIGN KEY (articleId) REFERENCES Article(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES Tag(id)
    );

    -- Universities table
    CREATE TABLE IF NOT EXISTS University (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    -- Article-University junction table
    CREATE TABLE IF NOT EXISTS ArticleUniversity (
      articleId TEXT NOT NULL,
      universityId INTEGER NOT NULL,
      PRIMARY KEY (articleId, universityId),
      FOREIGN KEY (articleId) REFERENCES Article(id) ON DELETE CASCADE,
      FOREIGN KEY (universityId) REFERENCES University(id)
    );

    -- Companies table
    CREATE TABLE IF NOT EXISTS Company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    );

    -- Article-Company junction table
    CREATE TABLE IF NOT EXISTS ArticleCompany (
      articleId TEXT NOT NULL,
      companyId INTEGER NOT NULL,
      PRIMARY KEY (articleId, companyId),
      FOREIGN KEY (articleId) REFERENCES Article(id) ON DELETE CASCADE,
      FOREIGN KEY (companyId) REFERENCES Company(id)
    );

    -- User settings table
    CREATE TABLE IF NOT EXISTS UserSettings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      theme TEXT DEFAULT 'light',
      language TEXT DEFAULT 'en',
      pdfViewer TEXT DEFAULT 'system',
      fontSize INTEGER DEFAULT 14,
      storagePath TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    -- ID Counter table to avoid duplicate IDs after deletion
    CREATE TABLE IF NOT EXISTS IdCounter (
      name TEXT PRIMARY KEY,
      nextId INTEGER NOT NULL DEFAULT 1
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_article_year ON Article(year);
    CREATE INDEX IF NOT EXISTS idx_article_read ON Article(read);
    CREATE INDEX IF NOT EXISTS idx_article_favorite ON Article(favorite);
    CREATE INDEX IF NOT EXISTS idx_article_rating ON Article(rating);
  `);

  console.log('Database schema initialized successfully');

  // Migration: Add storagePath column if it doesn't exist
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(UserSettings)`).all() as Array<{name: string}>;
    const hasStoragePath = tableInfo.some(col => col.name === 'storagePath');

    if (!hasStoragePath) {
      db.exec(`ALTER TABLE UserSettings ADD COLUMN storagePath TEXT`);
      console.log('Migration: Added storagePath column to UserSettings');
    }
  } catch (error) {
    console.log('Storage path column migration skipped or already exists');
  }

  // Migration: Add externalStoragePath and useExternalStorage columns
  try {
    const tableInfo = db.prepare(`PRAGMA table_info(UserSettings)`).all() as Array<{name: string}>;
    const hasExternalStoragePath = tableInfo.some(col => col.name === 'externalStoragePath');
    const hasUseExternalStorage = tableInfo.some(col => col.name === 'useExternalStorage');

    if (!hasExternalStoragePath) {
      db.exec(`ALTER TABLE UserSettings ADD COLUMN externalStoragePath TEXT`);
      console.log('Migration: Added externalStoragePath column to UserSettings');
    }

    if (!hasUseExternalStorage) {
      db.exec(`ALTER TABLE UserSettings ADD COLUMN useExternalStorage INTEGER DEFAULT 0`);
      console.log('Migration: Added useExternalStorage column to UserSettings');
    }
  } catch (error) {
    console.log('External storage columns migration skipped or already exists');
  }

  // Migration: Initialize article ID counter if not exists
  try {
    const counter = db.prepare(`SELECT nextId FROM IdCounter WHERE name = 'article'`).get() as { nextId: number } | undefined;

    if (!counter) {
      // Get the highest existing article ID to initialize the counter
      const lastArticle = db.prepare(`SELECT id FROM Article ORDER BY CAST(id AS INTEGER) DESC LIMIT 1`).get() as { id: string } | undefined;
      const nextId = lastArticle ? parseInt(lastArticle.id) + 1 : 1;

      db.prepare(`INSERT INTO IdCounter (name, nextId) VALUES ('article', ?)`).run(nextId);
      console.log(`Migration: Initialized article ID counter to ${nextId}`);
    }
  } catch (error) {
    console.log('ID counter migration error:', error);
  }

  // Close database on exit
  process.on('exit', () => {
    if (db) {
      db.close();
    }
  });

  return db;
}

// Helper function to get or create entity (Author, Keyword, etc.)
export function getOrCreateEntity(
  tableName: string,
  name: string
): { id: number; name: string } {
  const database = getDb();
  const selectStmt = database.prepare(`SELECT id, name FROM ${tableName} WHERE name = ?`);
  let entity = selectStmt.get(name) as { id: number; name: string } | undefined;

  if (!entity) {
    const insertStmt = database.prepare(`INSERT INTO ${tableName} (name) VALUES (?)`);
    const result = insertStmt.run(name);
    entity = { id: result.lastInsertRowid as number, name };
  }

  return entity;
}

// Helper to link article with entities
export function linkArticleEntity(
  junctionTable: string,
  articleId: string,
  entityId: number
) {
  const database = getDb();
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO ${junctionTable} (articleId, ${junctionTable.replace('Article', '').toLowerCase()}Id)
    VALUES (?, ?)
  `);
  stmt.run(articleId, entityId);
}

// Helper to clear article relations
export function clearArticleRelations(junctionTable: string, articleId: string) {
  const database = getDb();
  const stmt = database.prepare(`DELETE FROM ${junctionTable} WHERE articleId = ?`);
  stmt.run(articleId);
}

// Get next article ID and increment counter (never reuses IDs)
export function getNextArticleId(): string {
  const database = getDb();
  const getAndIncrement = database.transaction(() => {
    const counter = database.prepare(`SELECT nextId FROM IdCounter WHERE name = 'article'`).get() as { nextId: number } | undefined;

    if (!counter) {
      // Initialize counter if it doesn't exist
      database.prepare(`INSERT INTO IdCounter (name, nextId) VALUES ('article', 2)`).run();
      return 1;
    }

    const currentId = counter.nextId;
    database.prepare(`UPDATE IdCounter SET nextId = nextId + 1 WHERE name = 'article'`).run();
    return currentId;
  });

  const nextId = getAndIncrement();
  return String(nextId).padStart(4, '0');
}
