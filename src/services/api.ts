/**
 * API service for Electron IPC communication
 * This file communicates with the main process via IPC bridge
 */

import { Article, ArticleFormData } from '../types/article';

// Access the electronAPI exposed by preload script
const { electronAPI } = window;

export const articlesApi = {
  // Get all articles
  async getAll(): Promise<Article[]> {
    return electronAPI.articles.getAll();
  },

  // Get article by ID
  async getById(id: string): Promise<Article | null> {
    return electronAPI.articles.getById(id);
  },

  // Create new article
  async create(formData: ArticleFormData): Promise<Article> {
    return electronAPI.articles.create(formData);
  },

  // Update article
  async update(id: string, formData: Partial<ArticleFormData>): Promise<Article> {
    return electronAPI.articles.update(id, formData);
  },

  // Delete article
  async delete(id: string): Promise<void> {
    return electronAPI.articles.delete(id);
  },

  // Upload PDF
  // Now requires articleTitle for file naming: "{id} - {title}.pdf"
  async uploadPdf(articleId: string, articleTitle: string, file: File): Promise<string> {
    // Convert File to ArrayBuffer for IPC transfer
    const arrayBuffer = await file.arrayBuffer();
    return electronAPI.files.uploadPdf(articleId, articleTitle, arrayBuffer);
  },

  // Generate Word note
  async generateNote(article: Article): Promise<void> {
    return electronAPI.files.generateNote(article);
  },

  // Open PDF with system default application
  async openPdf(articleId: string): Promise<void> {
    return electronAPI.files.openPdf(articleId);
  },

  // Open Word note with system default application
  async openNote(articleId: string): Promise<void> {
    return electronAPI.files.openNote(articleId);
  },

  // Open URL in system default browser
  async openUrl(url: string): Promise<void> {
    return electronAPI.files.openUrl(url);
  },

  // Migrate file names from old format (PAPER001.pdf) to new format (PAPER001 - Title.pdf)
  async migrateFileNames(): Promise<{success: boolean; migratedPdfs: number; migratedNotes: number; totalArticles: number; errors?: string[]}> {
    return electronAPI.files.migrateFileNames();
  },
};

export const settingsApi = {
  // Get user settings
  async get(): Promise<any> {
    return electronAPI.settings.get();
  },

  // Update user settings
  async update(settings: any): Promise<void> {
    return electronAPI.settings.update(settings);
  },
};

export const databaseApi = {
  // Get database statistics
  async getStats(): Promise<any> {
    return electronAPI.database.getStats();
  },

  // Optimize database
  async optimize(): Promise<void> {
    return electronAPI.database.optimize();
  },
};
