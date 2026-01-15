/**
 * IPC Handlers for Article operations
 * Handles all database operations for articles using better-sqlite3
 */

import { ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { Article, ArticleFormData } from '../../types/article';
import { getDb, getOrCreateEntity, linkArticleEntity, clearArticleRelations, getNextArticleId } from '../database';
import { StoragePaths } from '../paths';

// Utility function to transform DB result to Article type with relations
function getArticleWithRelations(id: string): Article | null {
  const db = getDb();
  const articleStmt = db.prepare(`SELECT * FROM Article WHERE id = ?`);
  const article = articleStmt.get(id) as any;

  if (!article) return null;

  // Get related entities
  const authors = db.prepare(`
    SELECT a.id, a.name FROM Author a
    JOIN ArticleAuthor aa ON a.id = aa.authorId
    WHERE aa.articleId = ?
  `).all(id) as Array<{ id: number; name: string }>;

  const keywords = db.prepare(`
    SELECT k.id, k.name FROM Keyword k
    JOIN ArticleKeyword ak ON k.id = ak.keywordId
    WHERE ak.articleId = ?
  `).all(id) as Array<{ id: number; name: string }>;

  const subjects = db.prepare(`
    SELECT s.id, s.name FROM Subject s
    JOIN ArticleSubject as_join ON s.id = as_join.subjectId
    WHERE as_join.articleId = ?
  `).all(id) as Array<{ id: number; name: string }>;

  const tags = db.prepare(`
    SELECT t.id, t.name FROM Tag t
    JOIN ArticleTag at ON t.id = at.tagId
    WHERE at.articleId = ?
  `).all(id) as Array<{ id: number; name: string }>;

  const universities = db.prepare(`
    SELECT u.id, u.name FROM University u
    JOIN ArticleUniversity au ON u.id = au.universityId
    WHERE au.articleId = ?
  `).all(id) as Array<{ id: number; name: string }>;

  const companies = db.prepare(`
    SELECT c.id, c.name FROM Company c
    JOIN ArticleCompany ac ON c.id = ac.companyId
    WHERE ac.articleId = ?
  `).all(id) as Array<{ id: number; name: string }>;

  return {
    id: article.id,
    title: article.title,
    abstract: article.abstract,
    conclusion: article.conclusion || undefined,
    year: article.year,
    date: article.date,
    dateAdded: article.dateAdded,
    journal: article.journal || undefined,
    doi: article.doi || undefined,
    language: article.language || undefined,
    numPages: article.numPages || undefined,
    researchQuestion: article.researchQuestion || undefined,
    methodology: article.methodology || undefined,
    dataUsed: article.dataUsed || undefined,
    results: article.results || undefined,
    limitations: article.limitations || undefined,
    firstImp: article.firstImp || undefined,
    notes: article.notes || undefined,
    comment: article.comment || undefined,
    rating: article.rating,
    read: Boolean(article.read),
    favorite: Boolean(article.favorite),
    fileName: article.fileName,
    createdAt: article.createdAt || undefined,
    updatedAt: article.updatedAt || undefined,
    authors,
    keywords,
    subjects,
    tags,
    universities,
    companies,
  };
}

// Get all articles
ipcMain.handle('articles:getAll', async () => {
  try {
    const db = getDb();
    const articleIds = db.prepare(`SELECT id FROM Article ORDER BY dateAdded DESC`).all() as Array<{ id: string }>;
    return articleIds.map(({ id }) => getArticleWithRelations(id)).filter(Boolean);
  } catch (error) {
    console.error('Error getting articles:', error);
    throw error;
  }
});

// Get article by ID
ipcMain.handle('articles:getById', async (_event, id: string) => {
  try {
    return getArticleWithRelations(id);
  } catch (error) {
    console.error('Error getting article:', error);
    throw error;
  }
});

// Create new article
ipcMain.handle('articles:create', async (_event, formData: ArticleFormData) => {
  try {
    const db = getDb();
    // Check for duplicates
    const duplicateCheck = db.prepare(`
      SELECT a.id FROM Article a
      JOIN ArticleAuthor aa ON a.id = aa.articleId
      JOIN Author au ON aa.authorId = au.id
      WHERE a.title = ? AND au.name IN (${formData.authors.map(() => '?').join(',')})
      GROUP BY a.id
    `);
    const exists = duplicateCheck.get(formData.title, ...formData.authors);

    if (exists) {
      throw new Error('Article already exists with same title and authors');
    }

    // Get next ID from counter (never reuses IDs even after deletion)
    const nextId = getNextArticleId();

    // Generate file name
    const fileName = `${nextId} - ${formData.title.substring(0, 50).replace(/[^a-zA-Z0-9 ]/g, '')}`;

    // Start transaction
    const createArticle = db.transaction(() => {
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
        nextId,
        formData.title,
        formData.abstract,
        formData.conclusion || '',
        formData.year,
        formData.date,
        new Date().toISOString().split('T')[0],
        formData.journal || '',
        formData.doi || '',
        formData.language || 'English',
        formData.numPages || 0,
        formData.researchQuestion || '',
        formData.methodology || '',
        formData.dataUsed || '',
        formData.results || '',
        formData.limitations || '',
        formData.firstImp || '',
        formData.notes || '',
        formData.comment || '',
        formData.rating,
        formData.read ? 1 : 0,
        formData.favorite ? 1 : 0,
        fileName
      );

      // Link authors
      formData.authors.forEach((name) => {
        const author = getOrCreateEntity('Author', name);
        linkArticleEntity('ArticleAuthor', nextId, author.id);
      });

      // Link keywords
      (formData.keywords || []).forEach((name) => {
        const keyword = getOrCreateEntity('Keyword', name);
        linkArticleEntity('ArticleKeyword', nextId, keyword.id);
      });

      // Link subjects
      (formData.subjects || []).forEach((name) => {
        const subject = getOrCreateEntity('Subject', name);
        linkArticleEntity('ArticleSubject', nextId, subject.id);
      });

      // Link tags
      (formData.tags || []).forEach((name) => {
        const tag = getOrCreateEntity('Tag', name);
        linkArticleEntity('ArticleTag', nextId, tag.id);
      });

      // Link universities
      (formData.universities || []).forEach((name) => {
        const university = getOrCreateEntity('University', name);
        linkArticleEntity('ArticleUniversity', nextId, university.id);
      });

      // Link companies
      (formData.companies || []).forEach((name) => {
        const company = getOrCreateEntity('Company', name);
        linkArticleEntity('ArticleCompany', nextId, company.id);
      });
    });

    createArticle();

    return getArticleWithRelations(nextId);
  } catch (error) {
    console.error('Error creating article:', error);
    throw error;
  }
});

// Update article
ipcMain.handle('articles:update', async (_event, id: string, formData: Partial<ArticleFormData>) => {
  try {
    const db = getDb();
    const updateArticle = db.transaction(() => {
      // Build update query dynamically based on provided fields
      const updates: string[] = [];
      const values: any[] = [];

      if (formData.title !== undefined) {
        updates.push('title = ?');
        values.push(formData.title);
      }
      if (formData.abstract !== undefined) {
        updates.push('abstract = ?');
        values.push(formData.abstract);
      }
      if (formData.conclusion !== undefined) {
        updates.push('conclusion = ?');
        values.push(formData.conclusion);
      }
      if (formData.year !== undefined) {
        updates.push('year = ?');
        values.push(formData.year);
      }
      if (formData.date !== undefined) {
        updates.push('date = ?');
        values.push(formData.date);
      }
      if (formData.journal !== undefined) {
        updates.push('journal = ?');
        values.push(formData.journal);
      }
      if (formData.doi !== undefined) {
        updates.push('doi = ?');
        values.push(formData.doi);
      }
      if (formData.language !== undefined) {
        updates.push('language = ?');
        values.push(formData.language);
      }
      if (formData.numPages !== undefined) {
        updates.push('numPages = ?');
        values.push(formData.numPages);
      }
      if (formData.researchQuestion !== undefined) {
        updates.push('researchQuestion = ?');
        values.push(formData.researchQuestion);
      }
      if (formData.methodology !== undefined) {
        updates.push('methodology = ?');
        values.push(formData.methodology);
      }
      if (formData.dataUsed !== undefined) {
        updates.push('dataUsed = ?');
        values.push(formData.dataUsed);
      }
      if (formData.results !== undefined) {
        updates.push('results = ?');
        values.push(formData.results);
      }
      if (formData.limitations !== undefined) {
        updates.push('limitations = ?');
        values.push(formData.limitations);
      }
      if (formData.firstImp !== undefined) {
        updates.push('firstImp = ?');
        values.push(formData.firstImp);
      }
      if (formData.notes !== undefined) {
        updates.push('notes = ?');
        values.push(formData.notes);
      }
      if (formData.comment !== undefined) {
        updates.push('comment = ?');
        values.push(formData.comment);
      }
      if (formData.rating !== undefined) {
        updates.push('rating = ?');
        values.push(formData.rating);
      }
      if (formData.read !== undefined) {
        updates.push('read = ?');
        values.push(formData.read ? 1 : 0);
      }
      if (formData.favorite !== undefined) {
        updates.push('favorite = ?');
        values.push(formData.favorite ? 1 : 0);
      }

      updates.push(`updatedAt = datetime('now')`);

      if (updates.length > 0) {
        values.push(id);
        const updateStmt = db.prepare(`UPDATE Article SET ${updates.join(', ')} WHERE id = ?`);
        updateStmt.run(...values);
      }

      // Update relations if provided
      if (formData.authors !== undefined) {
        clearArticleRelations('ArticleAuthor', id);
        formData.authors.forEach((name) => {
          const author = getOrCreateEntity('Author', name);
          linkArticleEntity('ArticleAuthor', id, author.id);
        });
      }

      if (formData.keywords !== undefined) {
        clearArticleRelations('ArticleKeyword', id);
        formData.keywords.forEach((name) => {
          const keyword = getOrCreateEntity('Keyword', name);
          linkArticleEntity('ArticleKeyword', id, keyword.id);
        });
      }

      if (formData.subjects !== undefined) {
        clearArticleRelations('ArticleSubject', id);
        formData.subjects.forEach((name) => {
          const subject = getOrCreateEntity('Subject', name);
          linkArticleEntity('ArticleSubject', id, subject.id);
        });
      }

      if (formData.tags !== undefined) {
        clearArticleRelations('ArticleTag', id);
        formData.tags.forEach((name) => {
          const tag = getOrCreateEntity('Tag', name);
          linkArticleEntity('ArticleTag', id, tag.id);
        });
      }

      if (formData.universities !== undefined) {
        clearArticleRelations('ArticleUniversity', id);
        formData.universities.forEach((name) => {
          const university = getOrCreateEntity('University', name);
          linkArticleEntity('ArticleUniversity', id, university.id);
        });
      }

      if (formData.companies !== undefined) {
        clearArticleRelations('ArticleCompany', id);
        formData.companies.forEach((name) => {
          const company = getOrCreateEntity('Company', name);
          linkArticleEntity('ArticleCompany', id, company.id);
        });
      }
    });

    updateArticle();

    return getArticleWithRelations(id);
  } catch (error) {
    console.error('Error updating article:', error);
    throw error;
  }
});

// Delete article
ipcMain.handle('articles:delete', async (_event, id: string) => {
  try {
    const db = getDb();

    // Use centralized StoragePaths for storage location
    const storagePath = StoragePaths.root;

    // Delete PDF file if exists (named by article ID)
    const pdfPath = path.join(storagePath, 'pdfs', `${id}.pdf`);
    if (fs.existsSync(pdfPath)) {
      fs.unlinkSync(pdfPath);
      console.log(`Deleted PDF: ${pdfPath}`);
    }

    // Delete Note file if exists (Word docx, named by article ID)
    const notePath = path.join(storagePath, 'notes', `${id}.docx`);
    if (fs.existsSync(notePath)) {
      fs.unlinkSync(notePath);
      console.log(`Deleted Note: ${notePath}`);
    }

    // Also delete from external storage if configured
    const settings = db.prepare(`SELECT externalStoragePath, useExternalStorage FROM UserSettings LIMIT 1`).get() as {
      externalStoragePath: string | null;
      useExternalStorage: number | null;
    } | undefined;

    if (settings?.useExternalStorage && settings?.externalStoragePath) {
      const extPdfPath = path.join(settings.externalStoragePath, 'pdfs', `${id}.pdf`);
      if (fs.existsSync(extPdfPath)) {
        fs.unlinkSync(extPdfPath);
        console.log(`Deleted external PDF: ${extPdfPath}`);
      }

      const extNotePath = path.join(settings.externalStoragePath, 'notes', `${id}.docx`);
      if (fs.existsSync(extNotePath)) {
        fs.unlinkSync(extNotePath);
        console.log(`Deleted external Note: ${extNotePath}`);
      }
    }

    // CASCADE DELETE will handle relations automatically due to foreign keys
    const deleteStmt = db.prepare(`DELETE FROM Article WHERE id = ?`);
    deleteStmt.run(id);
  } catch (error) {
    console.error('Error deleting article:', error);
    throw error;
  }
});
