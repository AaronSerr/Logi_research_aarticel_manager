/**
 * IPC Handlers for File operations
 * Handles PDF uploads, Word note generation, and file opening
 *
 * Word generation uses template-based approach similar to make_note in old/utils.py
 */

import { ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import createReport from 'docx-templates';
import { Article } from '../../types/article';
import { getDb } from '../database';
import { StoragePaths, getTemplatePath } from '../paths';

// Storage paths - resolved at runtime via StoragePaths module
// This ensures correct paths in both dev and packaged mode
const getPdfDir = () => StoragePaths.pdfs;
const getNotesDir = () => StoragePaths.notes;

// Function to get external storage settings
function getExternalStorageSettings(): { enabled: boolean; path: string } {
  try {
    const db = getDb();
    const stmt = db.prepare(`SELECT externalStoragePath, useExternalStorage FROM UserSettings LIMIT 1`);
    const settings = stmt.get() as {
      externalStoragePath: string | null;
      useExternalStorage: number | null;
    } | undefined;

    return {
      enabled: Boolean(settings?.useExternalStorage),
      path: settings?.externalStoragePath || '',
    };
  } catch (error) {
    console.error('Error getting external storage settings:', error);
    return { enabled: false, path: '' };
  }
}

// Function to copy file to external storage if enabled
function copyToExternalIfEnabled(internalPath: string, subdir: 'pdfs' | 'notes', fileName: string): void {
  try {
    const external = getExternalStorageSettings();
    if (!external.enabled || !external.path) return;

    const externalDir = path.join(external.path, subdir);
    if (!fs.existsSync(externalDir)) {
      fs.mkdirSync(externalDir, { recursive: true });
    }

    const externalPath = path.join(externalDir, fileName);
    fs.copyFileSync(internalPath, externalPath);
    console.log(`Copied to external storage: ${externalPath}`);
  } catch (error) {
    console.error('Error copying to external storage:', error);
    // Don't throw - external copy failure shouldn't break main functionality
  }
}

// Upload PDF
ipcMain.handle('files:uploadPdf', async (_event, articleId: string, fileBuffer: ArrayBuffer, fileName: string) => {
  try {
    const pdfFileName = `${articleId}.pdf`;
    const pdfPath = path.join(getPdfDir(), pdfFileName);
    const buffer = Buffer.from(fileBuffer);

    // Ensure PDF directory exists
    const pdfDir = getPdfDir();
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // Save to internal storage (always)
    fs.writeFileSync(pdfPath, buffer);
    console.log(`PDF saved: ${pdfPath}`);

    // Copy to external storage if enabled
    copyToExternalIfEnabled(pdfPath, 'pdfs', pdfFileName);

    return pdfFileName;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
});

// Open PDF with system default application
ipcMain.handle('files:openPdf', async (_event, articleId: string) => {
  try {
    const pdfPath = path.join(getPdfDir(), `${articleId}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDF not found for article ${articleId}`);
    }

    await shell.openPath(pdfPath);
  } catch (error) {
    console.error('Error opening PDF:', error);
    throw error;
  }
});

// Get PDF path for preview
ipcMain.handle('files:getPdfPath', async (_event, articleId: string) => {
  try {
    const pdfPath = path.join(getPdfDir(), `${articleId}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      return null;
    }

    // Return the absolute path - we'll convert to file:// URL in renderer
    return pdfPath;
  } catch (error) {
    console.error('Error getting PDF path:', error);
    return null;
  }
});

// Get PDF as base64 for preview
ipcMain.handle('files:getPdfBase64', async (_event, articleId: string) => {
  try {
    const pdfPath = path.join(getPdfDir(), `${articleId}.pdf`);

    if (!fs.existsSync(pdfPath)) {
      return null;
    }

    const buffer = fs.readFileSync(pdfPath);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error reading PDF:', error);
    return null;
  }
});

// Open Word note with system default application
ipcMain.handle('files:openNote', async (_event, articleId: string) => {
  try {
    const notePath = path.join(getNotesDir(), `${articleId}.docx`);

    if (!fs.existsSync(notePath)) {
      throw new Error(`Note not found for article ${articleId}`);
    }

    await shell.openPath(notePath);
  } catch (error) {
    console.error('Error opening note:', error);
    throw error;
  }
});

// Open URL in system default browser
ipcMain.handle('files:openUrl', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
  } catch (error) {
    console.error('Error opening URL:', error);
    throw error;
  }
});

// Path to Word template - resolved via paths module for dev/production compatibility
const getTemplateFilePath = () => getTemplatePath('model-revue-article.docx');

/**
 * Prepare article data for template substitution
 * Replicates the data preparation logic from make_note in old/utils.py
 */
function prepareTemplateData(article: Article): Record<string, string> {
  // Generate rating stars display (like make_note)
  const rating = article.rating || 0;
  const ratingStars = `${'⭐'.repeat(rating)}${'✩'.repeat(5 - rating)} (${rating}/5)`;

  // Display ID with star if favorite
  const displayId = article.favorite ? `${article.id} ⭐` : article.id;

  // Display favorite/read status
  const displayFavorite = article.favorite ? '⭐ Yes' : '❌ No';
  const displayRead = article.read ? '✅ Yes' : '❌ No';

  // Helper to join array of objects with name property
  const joinNames = (arr: Array<{ name: string }> | undefined): string => {
    if (!arr || arr.length === 0) return '';
    return arr.map((item) => item.name).join(', ');
  };

  // Build replacement data object
  // Keys match the {{placeholder}} in the Word template
  return {
    id: article.id || '',
    display_id: displayId,
    title: article.title || '',
    author: joinNames(article.authors),
    year: article.year ? String(article.year) : '',
    date: article.date || '',
    journal: article.journal || '',
    doi: article.doi || '',
    language: article.language || '',
    num_pages: article.numPages ? String(article.numPages) : '',
    abstract: article.abstract || '',
    conclusion: article.conclusion || '',
    keywords: joinNames(article.keywords),
    subjects: joinNames(article.subjects),
    universities: joinNames(article.universities),
    companies: joinNames(article.companies),
    tags: joinNames(article.tags),
    research_question: article.researchQuestion || '',
    methodology: article.methodology || '',
    data_used: article.dataUsed || '',
    results: article.results || '',
    limitations: article.limitations || '',
    first_imp: article.firstImp || '',
    notes: article.notes || '',
    comment: article.comment || '',
    rating: String(rating),
    rating_stars: ratingStars,
    display_favorite: displayFavorite,
    display_read: displayRead,
    favorite: article.favorite ? 'Yes' : 'No',
    read: article.read ? 'Yes' : 'No',
    file_name: article.id || '',
    generated_date: new Date().toLocaleDateString('en-US'),
    // Date fields from article timestamps
    date_added: article.createdAt
      ? new Date(article.createdAt).toLocaleDateString('en-US')
      : '',
    updatedAt: article.updatedAt
      ? new Date(article.updatedAt).toLocaleDateString('en-US')
      : '',
  };
}

/**
 * Generate Word note from article using template
 * Replicates the logic of make_note function from old/utils.py
 */
ipcMain.handle('files:generateNote', async (_event, article: Article) => {
  try {
    const noteFileName = `${article.id}.docx`;
    const notesDir = getNotesDir();
    const notePath = path.join(notesDir, noteFileName);

    // Ensure notes directory exists
    if (!fs.existsSync(notesDir)) {
      fs.mkdirSync(notesDir, { recursive: true });
    }

    // Get template path
    const templatePath = getTemplateFilePath();

    // Check if template exists
    if (!fs.existsSync(templatePath)) {
      console.error(`Template not found at: ${templatePath}`);
      throw new Error(`Word template not found: ${templatePath}`);
    }

    // Read template file
    const template = fs.readFileSync(templatePath);

    // Prepare data for template (like make_note prepares replacements)
    const data = prepareTemplateData(article);

    // Generate document using docx-templates
    // This replaces {{placeholder}} tags in the template with actual values
    // failFast: false - continue if a placeholder is not found (allows template flexibility)
    // rejectNullish: false - accept null/undefined values (replace with empty string)
    const buffer = await createReport({
      template,
      data,
      cmdDelimiter: ['{{', '}}'],
      failFast: false,
      rejectNullish: false,
    });

    // Remove existing file if present (like make_note does)
    if (fs.existsSync(notePath)) {
      fs.unlinkSync(notePath);
    }

    // Save generated document
    fs.writeFileSync(notePath, buffer);
    console.log(`Note generated from template: ${notePath}`);

    // Copy to external storage if enabled
    copyToExternalIfEnabled(notePath, 'notes', noteFileName);
  } catch (error) {
    console.error('Error generating note:', error);
    throw error;
  }
});
