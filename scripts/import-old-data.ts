/**
 * Script to import old Streamlit JSON data into the new SQLite database
 * Usage: npx ts-node scripts/import-old-data.ts
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

// Path to old JSON data
const OLD_DATA_PATH = 'C:\\Users\\User\\Desktop\\Préparation Doctorat\\Papiers\\data\\backups\\articles.json';

// Path to new database
const DB_DIR = path.join(process.cwd(), 'storage', 'database');
const DB_PATH = path.join(DB_DIR, 'articles.db');

// Ensure database directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Create database connection
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper to get or create entity
function getOrCreateEntity(tableName: string, name: string): { id: number; name: string } {
  const selectStmt = db.prepare(`SELECT id, name FROM ${tableName} WHERE name = ?`);
  let entity = selectStmt.get(name) as { id: number; name: string } | undefined;

  if (!entity) {
    const insertStmt = db.prepare(`INSERT INTO ${tableName} (name) VALUES (?)`);
    const result = insertStmt.run(name);
    entity = { id: result.lastInsertRowid as number, name };
  }

  return entity;
}

// Helper to link article with entities
function linkArticleEntity(junctionTable: string, articleId: string, entityId: number) {
  const entityColumnName = junctionTable.replace('Article', '').toLowerCase() + 'Id';
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO ${junctionTable} (articleId, ${entityColumnName})
    VALUES (?, ?)
  `);
  stmt.run(articleId, entityId);
}

// Main import function
async function importData() {
  console.log('Starting data import...');
  console.log(`Reading from: ${OLD_DATA_PATH}`);

  // Read old JSON data
  if (!fs.existsSync(OLD_DATA_PATH)) {
    console.error(`Error: File not found at ${OLD_DATA_PATH}`);
    process.exit(1);
  }

  const jsonData = fs.readFileSync(OLD_DATA_PATH, 'utf-8');
  const articles = JSON.parse(jsonData);

  console.log(`Found ${articles.length} article(s) to import`);

  let imported = 0;
  let skipped = 0;

  for (const article of articles) {
    try {
      // Check if article already exists
      const existingStmt = db.prepare(`SELECT id FROM Article WHERE id = ?`);
      const existing = existingStmt.get(article.id);

      if (existing) {
        console.log(`⚠ Article ${article.id} already exists, skipping...`);
        skipped++;
        continue;
      }

      // Start transaction for each article
      const importArticle = db.transaction(() => {
        // Insert article
        const insertArticle = db.prepare(`
          INSERT INTO Article (
            id, title, abstract, conclusion, year, date, dateAdded,
            journal, doi, language, numPages, researchQuestion, methodology,
            dataUsed, results, limitations, firstImp, notes, comment,
            rating, read, favorite, fileName
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertArticle.run(
          article.id,
          article.title,
          article.abstract || '',
          article.conclusion || '',
          article.year,
          article.date,
          article.date_added,
          article.journal || '',
          article.doi || '',
          article.language || 'English',
          article.num_pages || 0,
          article.research_question || '',
          article.methodology || '',
          article.data_used || '',
          article.results || '',
          article.limitations || '',
          article.first_imp || '',
          article.notes || '',
          article.comment || '',
          article.rating || 0,
          article.read ? 1 : 0,
          article.favorite ? 1 : 0,
          article.file_name || article.id
        );

        // Link authors
        if (article.author && Array.isArray(article.author)) {
          article.author.forEach((name: string) => {
            const author = getOrCreateEntity('Author', name);
            linkArticleEntity('ArticleAuthor', article.id, author.id);
          });
        }

        // Link keywords
        if (article.keywords && Array.isArray(article.keywords)) {
          article.keywords.forEach((name: string) => {
            const keyword = getOrCreateEntity('Keyword', name);
            linkArticleEntity('ArticleKeyword', article.id, keyword.id);
          });
        }

        // Link subjects
        if (article.subjects && Array.isArray(article.subjects)) {
          article.subjects.forEach((name: string) => {
            const subject = getOrCreateEntity('Subject', name);
            linkArticleEntity('ArticleSubject', article.id, subject.id);
          });
        }

        // Link tags
        if (article.tags && Array.isArray(article.tags)) {
          article.tags.forEach((name: string) => {
            const tag = getOrCreateEntity('Tag', name);
            linkArticleEntity('ArticleTag', article.id, tag.id);
          });
        }

        // Link universities
        if (article.universities && Array.isArray(article.universities)) {
          article.universities.forEach((name: string) => {
            const university = getOrCreateEntity('University', name);
            linkArticleEntity('ArticleUniversity', article.id, university.id);
          });
        }

        // Link companies
        if (article.companies && Array.isArray(article.companies)) {
          article.companies.forEach((name: string) => {
            const company = getOrCreateEntity('Company', name);
            linkArticleEntity('ArticleCompany', article.id, company.id);
          });
        }
      });

      importArticle();
      console.log(`✓ Imported article: ${article.id} - ${article.title}`);
      imported++;
    } catch (error) {
      console.error(`✗ Error importing article ${article.id}:`, error);
    }
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total articles in file: ${articles.length}`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Skipped (already exists): ${skipped}`);
  console.log(`Failed: ${articles.length - imported - skipped}`);

  db.close();
  console.log('\nDatabase connection closed.');
}

// Run import
importData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
