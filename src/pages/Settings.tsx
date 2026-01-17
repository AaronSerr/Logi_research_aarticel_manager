import React, { useState, useEffect, useRef } from 'react';
import { settingsApi, articlesApi } from '../services/api';
import { useSettingsStore } from '../store/settings';
import { useArticlesStore } from '../store/articles';
import { useTranslation } from '../hooks/useTranslation';
import { Article } from '../types/article';

declare global {
  interface Window {
    electronAPI: any;
  }
}

// Column names for CSV export (matching database structure)
const CSV_COLUMNS = [
  'id', 'title', 'abstract', 'conclusion', 'year', 'date', 'dateAdded', 'journal', 'doi',
  'language', 'numPages', 'researchQuestion', 'methodology', 'dataUsed', 'results',
  'limitations', 'firstImp', 'notes', 'comment', 'rating', 'read', 'favorite', 'fileName',
  'authors', 'keywords', 'subjects', 'tags', 'universities', 'companies'

];

export default function Settings() {
  const { theme, setTheme, setLanguage } = useSettingsStore();
  const { articles, setArticles, addArticle } = useArticlesStore();
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState({
    language: 'en',
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // External storage state
  const [externalStorage, setExternalStorage] = useState({
    enabled: false,
    path: '',
  });
  const [copyingToExternal, setCopyingToExternal] = useState(false);

  // Import/Export state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importModal, setImportModal] = useState<{
    show: boolean;
    total: number;
    toImport: number;
    duplicates: number;
    data: any[];
  } | null>(null);

  // Load settings on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load language from database (theme is managed by Zustand store with localStorage persistence)
        const userSettings = await settingsApi.get();
        if (userSettings) {
          const lang = userSettings.language || 'en';
          setSettings({
            language: lang,
          });
          setLanguage(lang); // Sync with Zustand store for immediate UI translations
        }

        // Load external storage settings
        const externalSettings = await window.electronAPI.storage.getExternalSettings();
        setExternalStorage({
          enabled: externalSettings.useExternalStorage,
          path: externalSettings.externalStoragePath,
        });
      } catch (error: any) {
        console.error('Error loading settings:', error);
        setMessage({ type: 'error', text: 'Failed to load settings' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle theme change - auto-save
  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    try {
      await settingsApi.update({
        ...settings,
        theme: newTheme,
      });
    } catch (error: any) {
      console.error('Failed to save theme:', error);
    }
  };

  // Handle language change - auto-save
  const handleLanguageChange = async (newLanguage: string) => {
    setSettings({ ...settings, language: newLanguage });
    setLanguage(newLanguage); // Update Zustand store for immediate UI update
    try {
      await settingsApi.update({
        ...settings,
        language: newLanguage,
        theme,
      });
    } catch (error: any) {
      console.error('Failed to save language:', error);
    }
  };

  // External Storage Handlers
  const handleChooseExternalPath = async () => {
    try {
      setMessage(null);
      const selectedPath = await window.electronAPI.storage.chooseExternalPath();

      if (!selectedPath) {
        return; // User cancelled
      }

      setExternalStorage((prev) => ({ ...prev, path: selectedPath }));
      setMessage({ type: 'success', text: 'External folder selected. Click "Save External Settings" to apply.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error selecting folder: ${error.message}` });
    }
  };

  const handleToggleExternalStorage = (enabled: boolean) => {
    setExternalStorage((prev) => ({ ...prev, enabled }));
  };

  const handleSaveExternalSettings = async () => {
    try {
      setMessage(null);

      if (externalStorage.enabled && !externalStorage.path) {
        setMessage({ type: 'error', text: 'Please select an external folder first.' });
        return;
      }

      const result = await window.electronAPI.storage.updateExternalSettings({
        externalStoragePath: externalStorage.path,
        useExternalStorage: externalStorage.enabled,
      });

      if (result.success) {
        setMessage({ type: 'success', text: '✅ External storage settings saved!' });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Failed to save: ${error.message}` });
    }
  };

  const handleCopyExistingToExternal = async () => {
    try {
      if (!externalStorage.path) {
        setMessage({ type: 'error', text: 'Please select an external folder first.' });
        return;
      }

      const confirmed = window.confirm(
        `This will copy all existing PDFs and Notes to:\n${externalStorage.path}\n\nContinue?`
      );

      if (!confirmed) return;

      setCopyingToExternal(true);
      setMessage({ type: 'success', text: 'Copying files to external storage...' });

      const result = await window.electronAPI.storage.copyToExternal(externalStorage.path);

      if (result.success) {
        setMessage({ type: 'success', text: `✅ ${result.message}` });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `Copy failed: ${error.message}` });
    } finally {
      setCopyingToExternal(false);
    }
  };

  // =====================
  // Import/Export Functions
  // =====================

  // Convert article to flat object for CSV
  const articleToFlat = (article: Article) => {
    return {
      id: article.id,
      title: article.title,
      abstract: article.abstract,
      conclusion: article.conclusion || '',
      year: article.year,
      date: article.date,
      dateAdded: article.dateAdded,
      journal: article.journal || '',
      doi: article.doi || '',
      language: article.language,
      numPages: article.numPages,
      researchQuestion: article.researchQuestion || '',
      methodology: article.methodology || '',
      dataUsed: article.dataUsed || '',
      results: article.results || '',
      limitations: article.limitations || '',
      firstImp: article.firstImp || '',
      notes: article.notes || '',
      comment: article.comment || '',
      rating: article.rating,
      read: article.read,
      favorite: article.favorite,
      fileName: article.fileName,
      authors: article.authors?.map(a => a.name).join('; ') || '',
      keywords: article.keywords?.map(k => k.name).join('; ') || '',
      subjects: article.subjects?.map(s => s.name).join('; ') || '',
      tags: article.tags?.map(t => t.name).join('; ') || '',
      universities: article.universities?.map(u => u.name).join('; ') || '',
      companies: article.companies?.map(c => c.name).join('; ') || '',
    };
  };

  // Escape CSV value
  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      setMessage(null);

      const allArticles = await articlesApi.getAll();

      // Header row
      const header = CSV_COLUMNS.join(',');

      // Data rows
      const rows = allArticles.map(article => {
        const flat = articleToFlat(article);
        return CSV_COLUMNS.map(col => escapeCSV((flat as any)[col])).join(',');
      });

      const csvContent = [header, ...rows].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `articles_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: `✅ Exported ${allArticles.length} articles to CSV!` });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Export failed: ${error.message}` });
    } finally {
      setExporting(false);
    }
  };

  // Parse CSV line respecting quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  };

  // Handle CSV file import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage(null);

      if (!file.name.endsWith('.csv')) {
        throw new Error('Please select a CSV file');
      }

      const text = await file.text();
      const importedArticles: any[] = [];

      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) {
        throw new Error('CSV file must have a header row and at least one data row');
      }

      const headers = parseCSVLine(lines[0]);

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const article: any = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          const cleanHeader = header.trim();

          // Convert types
          if (cleanHeader === 'year' || cleanHeader === 'numPages' || cleanHeader === 'rating') {
            article[cleanHeader] = parseInt(value) || 0;
          } else if (cleanHeader === 'read' || cleanHeader === 'favorite') {
            article[cleanHeader] = value.toLowerCase() === 'true' || value === '1';
          } else if (['authors', 'keywords', 'subjects', 'tags', 'universities', 'companies'].includes(cleanHeader)) {
            // Convert semicolon-separated to array
            article[cleanHeader] = value.split(';').map((s: string) => s.trim()).filter(Boolean);
          } else {
            article[cleanHeader] = value;
          }
        });

        importedArticles.push(article);
      }

      // Helper function to normalize string for comparison
      const normalize = (str: string) => str?.toLowerCase().trim() || '';

      // Helper function to get authors string for comparison
      const getAuthorsKey = (authorsData: any) => {
        if (Array.isArray(authorsData)) {
          return authorsData.map((a: any) => normalize(typeof a === 'string' ? a : a.name)).sort().join('|');
        }
        return '';
      };

      // Check for duplicates based on title + authors
      const toImport: any[] = [];
      const duplicates: any[] = [];

      for (const articleData of importedArticles) {
        const title = normalize(articleData.title);
        const authorsKey = getAuthorsKey(articleData.authors);

        // Check if article with same title AND authors already exists in library
        const isDuplicate = articles.some(existing => {
          const existingTitle = normalize(existing.title);
          const existingAuthorsKey = existing.authors?.map(a => normalize(a.name)).sort().join('|') || '';
          return existingTitle === title && existingAuthorsKey === authorsKey;
        });

        if (isDuplicate) {
          duplicates.push(articleData);
        } else {
          toImport.push(articleData);
        }
      }

      // Show confirmation modal
      setImportModal({
        show: true,
        total: importedArticles.length,
        toImport: toImport.length,
        duplicates: duplicates.length,
        data: toImport
      });
      setImporting(false);

    } catch (error: any) {
      setMessage({ type: 'error', text: `Import failed: ${error.message}` });
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Confirm and execute import
  const confirmImport = async () => {
    if (!importModal) return;

    setImporting(true);
    let imported = 0;
    let errors = 0;

    for (const articleData of importModal.data) {
      try {
        const formData = {
          title: articleData.title || 'Untitled',
          abstract: articleData.abstract || '',
          conclusion: articleData.conclusion || '',
          year: articleData.year || new Date().getFullYear(),
          date: articleData.date || new Date().toISOString().split('T')[0],
          journal: articleData.journal || '',
          doi: articleData.doi || '',
          language: articleData.language || 'English',
          numPages: articleData.numPages || 0,
          researchQuestion: articleData.researchQuestion || '',
          methodology: articleData.methodology || '',
          dataUsed: articleData.dataUsed || '',
          results: articleData.results || '',
          limitations: articleData.limitations || '',
          firstImp: articleData.firstImp || '',
          notes: articleData.notes || '',
          comment: articleData.comment || '',
          rating: articleData.rating || 0,
          read: articleData.read || false,
          favorite: articleData.favorite || false,
          authors: Array.isArray(articleData.authors) ? articleData.authors : [],
          keywords: Array.isArray(articleData.keywords) ? articleData.keywords : [],
          subjects: Array.isArray(articleData.subjects) ? articleData.subjects : [],
          tags: Array.isArray(articleData.tags) ? articleData.tags : [],
          universities: Array.isArray(articleData.universities) ? articleData.universities : [],
          companies: Array.isArray(articleData.companies) ? articleData.companies : [],
        };

        const newArticle = await articlesApi.create(formData);
        addArticle(newArticle);
        imported++;
      } catch (err) {
        console.error('Error importing article:', articleData.title, err);
        errors++;
      }
    }

    const resultParts = [`✅ Import complete! ${imported} imported`];
    if (importModal.duplicates > 0) {
      resultParts.push(`${importModal.duplicates} duplicates skipped`);
    }
    if (errors > 0) {
      resultParts.push(`${errors} errors`);
    }
    const resultText = resultParts.join(' | ') + ' | IDs auto-assigned';

    setMessage({ type: 'success', text: resultText });
    setTimeout(() => setMessage(null), 7000);

    setImportModal(null);
    setImporting(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-lg">{t('settings.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">⚙️ {t('settings.title')}</h1>

      {message && (
        <div
          className={`mb-6 px-4 py-3 rounded ${message.type === 'success'
              ? 'bg-green-100 border border-green-400 text-green-700 dark:bg-green-900 dark:border-green-600 dark:text-green-200'
              : 'bg-red-100 border border-red-400 text-red-700 dark:bg-red-900 dark:border-red-600 dark:text-red-200'
            }`}
        >
          {message.text}
        </div>
      )}

      {/* General Settings */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('settings.general')}</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.theme')}</label>
            <select
              value={theme}
              onChange={(e) => handleThemeChange(e.target.value as 'light' | 'dark')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="light">{t('settings.theme.light')}</option>
              <option value="dark">{t('settings.theme.dark')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">{t('settings.language')}</label>
            <select
              value={settings.language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="es">Español</option>
              <option value="zh">中文</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('settings.language.note')}
            </p>
          </div>
        </div>
      </section>

      {/* External Storage (Copy) */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">📤 {t('storage.title')}</h2>

        <div className="space-y-4">
          <div className="bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              {t('storage.description')}
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">{t('storage.enable')}</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('storage.enable.desc')}</p>
            </div>
            <button
              onClick={() => handleToggleExternalStorage(!externalStorage.enabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${externalStorage.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${externalStorage.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>

          {/* External Path */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('storage.path')}</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono break-all">
                {externalStorage.path || t('storage.noFolder')}
              </div>
              <button
                onClick={handleChooseExternalPath}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:opacity-80"
              >
                {t('storage.browse')}
              </button>
              {externalStorage.path && (
                <button
                  onClick={() => setExternalStorage({ enabled: false, path: '' })}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:opacity-80"
                  title={t('storage.clear')}
                >
                  {t('storage.clear')}
                </button>
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveExternalSettings}
            className="w-full bg-purple-600 text-white py-2 px-4 rounded-lg hover:opacity-90"
          >
            💾 {t('storage.save')}
          </button>

          {/* Copy Existing Files */}
          {externalStorage.path && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('storage.copyPrompt')}
              </p>
              <button
                onClick={handleCopyExistingToExternal}
                disabled={copyingToExternal}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {copyingToExternal ? `⏳ ${t('storage.copying')}` : `📋 ${t('storage.copy')}`}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Import/Export Data */}
      <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">📦 {t('importExport.title')}</h2>

        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Export:</strong> {t('importExport.description.export')}<br />
              <strong>Import:</strong> {t('importExport.description.import')}
            </p>
          </div>

          {/* Export Section */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('importExport.export')}</label>
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              {exporting ? `⏳ ${t('importExport.exporting')}` : `📊 ${t('importExport.exportBtn')}`}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t('common.currentLibrary')} {articles.length} {t('common.articles')}
            </p>
          </div>

          {/* Import Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <label className="block text-sm font-medium mb-2">{t('importExport.import')}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
              id="import-file"
            />
            <label
              htmlFor="import-file"
              className={`block w-full text-center py-3 px-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${importing
                  ? 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 cursor-not-allowed'
                  : 'border-blue-300 dark:border-blue-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900'
                }`}
            >
              {importing ? (
                <span className="text-gray-500 dark:text-gray-400">⏳ {t('importExport.importing')}</span>
              ) : (
                <span className="text-blue-600 dark:text-blue-400">
                  📂 {t('importExport.selectFile')}
                </span>
              )}
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {t('importExport.csvFormat')}
            </p>
          </div>

          {/* Column Reference */}
          <details className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <summary className="text-sm font-medium cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              📋 {t('importExport.viewColumns')}
            </summary>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono overflow-x-auto">
              {CSV_COLUMNS.join(', ')}
            </div>
          </details>
        </div>
      </section>

      {/* Import Confirmation Modal */}
      {importModal?.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4 text-blue-600 dark:text-blue-400">📊 {t('importExport.analysis')}</h3>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">{t('importExport.total')}</span>
                <span className="font-semibold">{importModal.total}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-green-600 dark:text-green-400">✅ {t('importExport.toImport')}</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{importModal.toImport}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-red-600 dark:text-red-400">❌ {t('importExport.duplicates')}</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{importModal.duplicates}</span>
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 bg-gray-100 dark:bg-gray-700 p-3 rounded">
              ℹ️ {t('importExport.idsNote')}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setImportModal(null)}
                disabled={importing}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded-lg hover:opacity-80 disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmImport}
                disabled={importing || importModal.toImport === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {importing ? `⏳ ${t('importExport.importing')}` : t('importExport.importBtn', { count: importModal.toImport })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
