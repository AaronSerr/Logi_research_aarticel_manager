/**
 * Electron-based import script
 * This script runs inside Electron to import old data
 */

import { ipcMain } from 'electron';
import * as fs from 'fs';
import { db, getOrCreateEntity, linkArticleEntity } from '../src/electron/database';

// Path to old JSON data
const OLD_DATA_PATH = 'C:\\Users\\User\\Desktop\\Préparation Doctorat\\Papiers\\data\\backups\\articles.json';

// Import handler
ipcMain.handle('import:oldData', async () => {
  console.log('Starting data import from old Streamlit database...');
  console.log(`Reading from: ${OLD_DATA_PATH}`);

  try {
    // Read old JSON data
    if (!fs.existsSync(OLD_DATA_PATH)) {
      throw new Error(`File not found at ${OLD_DATA_PATH}`);
    }

    const jsonData = fs.readFileSync(OLD_DATA_PATH, 'utf-8');
    const articles = JSON.parse(jsonData);

    console.log(`Found ${articles.length} article(s) to import`);

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

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
        const errorMsg = `Error importing article ${article.id}: ${error}`;
        console.error(`✗ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    const summary = {
      total: articles.length,
      imported,
      skipped,
      failed: articles.length - imported - skipped,
      errors,
    };

    console.log('\n=== Import Summary ===');
    console.log(`Total articles in file: ${summary.total}`);
    console.log(`Successfully imported: ${summary.imported}`);
    console.log(`Skipped (already exists): ${summary.skipped}`);
    console.log(`Failed: ${summary.failed}`);

    return summary;
  } catch (error) {
    console.error('Fatal error during import:', error);
    throw error;
  }
});
