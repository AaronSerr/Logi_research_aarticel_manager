import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Article, ArticleFormData } from '../types/article';
import { articlesApi } from '../services/api';
import { useArticlesStore } from '../store/articles';
import { useSettingsStore } from '../store/settings';
import { useTranslation } from '../hooks/useTranslation';
import { checkTitle, starBar } from '../lib/utils';
import { formatDate } from '../utils/text';
import { CleanTextarea } from '../components/form/CleanTextarea';

export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateArticle = useArticlesStore((state) => state.updateArticle);
  const { sidebarCollapsed, setUnsavedChanges, clearUnsavedChanges, theme } = useSettingsStore();
  const { t } = useTranslation();

  // Mode: 'view' or 'edit'
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [article, setArticle] = useState<Article | null>(null);
  const [originalArticle, setOriginalArticle] = useState<Article | null>(null);

  // Form data for editing
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    abstract: '',
    conclusion: '',
    year: new Date().getFullYear(),
    date: new Date().toISOString().split('T')[0],
    journal: '',
    doi: '',
    language: 'English',
    numPages: 0,
    researchQuestion: '',
    methodology: '',
    dataUsed: '',
    results: '',
    limitations: '',
    firstImp: '',
    notes: '',
    comment: '',
    rating: 0,
    read: false,
    favorite: false,
    authors: [],
    keywords: [],
    subjects: [],
    tags: [],
    universities: [],
    companies: [],
  });

  // Input states for comma-separated fields
  const [authorsInput, setAuthorsInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [universitiesInput, setUniversitiesInput] = useState('');
  const [companiesInput, setCompaniesInput] = useState('');

  // PDF Upload
  const [pdfFile, setPdfFile] = useState<File | null>(null);

  // UI States
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // PDF panel resizing
  const [pdfPanelWidth, setPdfPanelWidth] = useState(50); // percentage
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle mouse move for resizing
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;

    // Clamp between 20% and 80%
    const clampedWidth = Math.min(80, Math.max(20, newWidth));
    setPdfPanelWidth(clampedWidth);
  }, []);

  // Handle mouse up to stop resizing
  const handleMouseUp = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Start resizing
  const startResizing = useCallback(() => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  // Add/remove event listeners for resizing
  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Warn before closing window/tab with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges && mode === 'edit') {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges, mode]);

  // Simple cancel edit - the Sidebar handles the unsaved changes modal
  const safeCancelEdit = () => {
    if (hasChanges) {
      // Show confirmation - reuse the pattern from sidebar
      if (window.confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        cancelEdit();
      }
    } else {
      cancelEdit();
    }
  };

  // Load article data
  useEffect(() => {
    const loadArticle = async () => {
      if (!id) {
        setError('No article ID provided');
        setLoadingArticle(false);
        return;
      }

      try {
        setLoadingArticle(true);
        const loadedArticle = await articlesApi.getById(id);

        if (!loadedArticle) {
          setError('Article not found');
          return;
        }

        setArticle(loadedArticle);
        setOriginalArticle(loadedArticle);
        populateFormData(loadedArticle);
      } catch (err: any) {
        setError(err.message || 'Failed to load article');
      } finally {
        setLoadingArticle(false);
      }
    };

    loadArticle();
  }, [id]);

  // Populate form data from article
  const populateFormData = (art: Article) => {
    setFormData({
      title: art.title,
      abstract: art.abstract,
      conclusion: art.conclusion || '',
      year: art.year,
      date: art.date,
      journal: art.journal || '',
      doi: art.doi || '',
      language: art.language || 'English',
      numPages: art.numPages || 0,
      researchQuestion: art.researchQuestion || '',
      methodology: art.methodology || '',
      dataUsed: art.dataUsed || '',
      results: art.results || '',
      limitations: art.limitations || '',
      firstImp: art.firstImp || '',
      notes: art.notes || '',
      comment: art.comment || '',
      rating: art.rating,
      read: art.read,
      favorite: art.favorite,
      authors: art.authors?.map(a => a.name) || [],
      keywords: art.keywords?.map(k => k.name) || [],
      subjects: art.subjects?.map(s => s.name) || [],
      tags: art.tags?.map(t => t.name) || [],
      universities: art.universities?.map(u => u.name) || [],
      companies: art.companies?.map(c => c.name) || [],
    });

    setAuthorsInput(art.authors?.map(a => a.name).join(', ') || '');
    setKeywordsInput(art.keywords?.map(k => k.name).join(', ') || '');
    setSubjectsInput(art.subjects?.map(s => s.name).join(', ') || '');
    setTagsInput(art.tags?.map(t => t.name).join(', ') || '');
    setUniversitiesInput(art.universities?.map(u => u.name).join(', ') || '');
    setCompaniesInput(art.companies?.map(c => c.name).join(', ') || '');
  };

  // Track changes
  useEffect(() => {
    if (mode === 'edit' && originalArticle) {
      const formChanged =
        // Basic info
        formData.title !== originalArticle.title ||
        formData.abstract !== originalArticle.abstract ||
        formData.conclusion !== (originalArticle.conclusion || '') ||
        formData.date !== originalArticle.date ||
        formData.journal !== (originalArticle.journal || '') ||
        formData.doi !== (originalArticle.doi || '') ||
        formData.language !== (originalArticle.language || 'English') ||
        formData.numPages !== (originalArticle.numPages || 0) ||
        // Research content
        formData.researchQuestion !== (originalArticle.researchQuestion || '') ||
        formData.methodology !== (originalArticle.methodology || '') ||
        formData.dataUsed !== (originalArticle.dataUsed || '') ||
        formData.results !== (originalArticle.results || '') ||
        formData.limitations !== (originalArticle.limitations || '') ||
        // Notes & comments
        formData.firstImp !== (originalArticle.firstImp || '') ||
        formData.notes !== (originalArticle.notes || '') ||
        formData.comment !== (originalArticle.comment || '') ||
        // Status
        formData.rating !== originalArticle.rating ||
        formData.read !== originalArticle.read ||
        formData.favorite !== originalArticle.favorite ||
        // Comma-separated inputs
        authorsInput !== (originalArticle.authors?.map(a => a.name).join(', ') || '') ||
        keywordsInput !== (originalArticle.keywords?.map(k => k.name).join(', ') || '') ||
        subjectsInput !== (originalArticle.subjects?.map(s => s.name).join(', ') || '') ||
        tagsInput !== (originalArticle.tags?.map(t => t.name).join(', ') || '') ||
        universitiesInput !== (originalArticle.universities?.map(u => u.name).join(', ') || '') ||
        companiesInput !== (originalArticle.companies?.map(c => c.name).join(', ') || '') ||
        // PDF
        pdfFile !== null;

      setHasChanges(formChanged);

      if (formChanged) {
        setUnsavedChanges(true, saveChanges);
      } else {
        clearUnsavedChanges();
      }
    } else {
      clearUnsavedChanges();
    }
  }, [mode, formData, authorsInput, keywordsInput, subjectsInput, tagsInput, universitiesInput, companiesInput, pdfFile, originalArticle]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearUnsavedChanges();
    };
  }, []);

  // Load PDF when preview is shown
  useEffect(() => {
    const loadPdf = async () => {
      if (showPdfPreview && id && !pdfBase64) {
        setLoadingPdf(true);
        try {
          const base64 = await window.electronAPI.files.getPdfBase64(id);
          setPdfBase64(base64);
        } catch (err) {
          console.error('Error loading PDF:', err);
        } finally {
          setLoadingPdf(false);
        }
      }
    };

    loadPdf();
  }, [showPdfPreview, id]);

  // Enter edit mode
  const enterEditMode = () => {
    setMode('edit');
    setSuccess(false);
    setError(null);
  };

  // Cancel editing
  const cancelEdit = () => {
    if (originalArticle) {
      populateFormData(originalArticle);
    }
    setPdfFile(null);
    setHasChanges(false);
    setMode('view');
    setError(null);
  };

  // Save changes
  const saveChanges = async () => {
    if (!id || !article) return;

    setError(null);
    setSuccess(false);

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (authorsInput.trim().length === 0) {
      setError('At least one author is required');
      return;
    }

    if (!formData.abstract.trim()) {
      setError('Abstract is required');
      return;
    }

    try {
      setLoading(true);

      const authors = authorsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const keywords = keywordsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const subjects = subjectsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const universities = universitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
      const companies = companiesInput.split(',').map((s) => s.trim()).filter(Boolean);

      const submissionData: Partial<ArticleFormData> = {
        ...formData,
        title: checkTitle(formData.title),
        authors,
        keywords,
        subjects,
        tags,
        universities,
        companies,
      };

      const updatedArticle = await articlesApi.update(id, submissionData);

      // Upload PDF if provided (uses new naming format: "PAPER001 - Title.pdf")
      if (pdfFile) {
        await articlesApi.uploadPdf(id, updatedArticle.title, pdfFile);
      }

      await articlesApi.generateNote(updatedArticle);

      updateArticle(id, updatedArticle);
      setArticle(updatedArticle);
      setOriginalArticle(updatedArticle);
      populateFormData(updatedArticle);

      setSuccess(true);
      setHasChanges(false);
      setPdfFile(null);
      setMode('view');

      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to update article');
    } finally {
      setLoading(false);
    }
  };

  // Handle PDF drop
  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
    }
  };

  // Open PDF in system viewer
  const openPdf = async () => {
    if (!id) return;
    try {
      await articlesApi.openPdf(id);
    } catch (err: any) {
      setPdfError(err.message || 'PDF not found for this article');
      setTimeout(() => setPdfError(null), 3000);
    }
  };

  // Open Note in system viewer
  const openNote = async () => {
    if (!id) return;
    try {
      await articlesApi.openNote(id);
    } catch (err: any) {
      setError('Failed to open note: ' + err.message);
    }
  };

  // Open DOI link
  const openDoi = () => {
    if (article?.doi) {
      const doiUrl = article.doi.startsWith('http')
        ? article.doi
        : `https://doi.org/${article.doi}`;
      window.open(doiUrl, '_blank');
    }
  };

  // Render view field
  const renderViewField = (label: string, value: string | number | undefined) => {
    const displayValue = value ?? '';
    return (
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
          {label}
        </label>
        <p className="text-gray-900 dark:text-white">
          {displayValue || <span className="text-gray-400 italic text-sm">{t('common.notSpecified')}</span>}
        </p>
      </div>
    );
  };

  // Render edit field
  const renderEditField = (
    label: string,
    field: keyof ArticleFormData,
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' = 'text',
    options?: { value: string; label: string }[],
    rows?: number,
    required?: boolean
  ) => {
    return (
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {type === 'textarea' ? (
          <CleanTextarea
            value={formData[field] as string}
            onChange={(value) => setFormData({ ...formData, [field]: value })}
            rows={rows || 3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required={required}
          />
        ) : type === 'select' && options ? (
          <select
            value={formData[field] as string}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === 'number' ? (
          <input
            type="number"
            value={formData[field] as number}
            onChange={(e) => setFormData({ ...formData, [field]: parseInt(e.target.value) || 0 })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        ) : type === 'date' ? (
          <input
            type="date"
            value={formData[field] as string}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => {
              const newDate = e.target.value;
              setFormData({
                ...formData,
                [field]: newDate,
                year: newDate ? parseInt(newDate.split('-')[0]) : formData.year
              });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required={required}
          />
        ) : (
          <input
            type="text"
            value={formData[field] as string}
            onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            required={required}
          />
        )}
      </div>
    );
  };

  // Render comma-separated input field
  const renderCommaInput = (
    label: string,
    value: string,
    setValue: (v: string) => void,
    placeholder: string,
    required?: boolean
  ) => {
    return (
      <div className="mb-3">
        <label className="block text-sm font-medium mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          required={required}
        />
      </div>
    );
  };

  // Loading state
  if (loadingArticle) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center py-12">
          <p className="text-lg">Loading article...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !article) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/library')}
          className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          ← Back to Library
        </button>
      </div>
    );
  }

  if (!article) return null;

  return (
    <div className="flex h-full" ref={containerRef}>
      {/* Main Content */}
      <div
        className="flex flex-col overflow-hidden relative"
        style={{ width: showPdfPreview ? `${100 - pdfPanelWidth}%` : '100%' }}
      >
        {/* ============= STICKY TITLE HEADER ============= */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 shadow-sm">
          {mode === 'view' ? (
            <div className="flex items-center gap-3">
              <span className={article.read ? 'text-blue-600' : 'text-gray-400'}>
                {article.read ? '👁️' : '📌'}
              </span>
              <span className={article.favorite ? 'text-yellow-500' : 'text-gray-400'}>
                {article.favorite ? '⭐' : '☆'}
              </span>
              <h1 className="text-xl font-bold dark:text-white truncate">{article.title}</h1>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.read}
                  onChange={(e) => setFormData({ ...formData, read: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                  style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                />
                <span className="dark:text-white text-sm">👁️</span>
              </label>
              <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={formData.favorite}
                  onChange={(e) => setFormData({ ...formData, favorite: e.target.checked })}
                  className="w-4 h-4 rounded accent-blue-600"
                  style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                />
                <span className="dark:text-white text-sm">⭐</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-bold"
                placeholder="Title"
                required
              />
            </div>
          )}

        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ============= INFO GRID: 3 Columns ============= */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">📋 Informations</h2>
            <div className="grid grid-cols-3 gap-6">
              {/* Column 1 (1/3): ID, Year, Journal, Language, Pages */}
              <div className="space-y-2">
                {mode === 'view' ? (
                  <>
                    {renderViewField('ID', article.id)}
                    {renderViewField(t('field.date'), formatDate(article.date))}
                    {renderViewField(t('field.journal'), article.journal)}
                    {renderViewField(t('field.language'), article.language)}
                    {renderViewField(t('field.numPages'), article.numPages)}
                  </>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">ID</label>
                      <p className="text-gray-900 dark:text-white font-mono">{article.id}</p>
                    </div>
                    {renderEditField(t('field.date'), 'date', 'date', undefined, undefined, true)}
                    {renderEditField(t('field.journal'), 'journal')}
                    {renderEditField(t('field.language'), 'language', 'select', [
                      { value: 'English', label: 'English' },
                      { value: 'French', label: 'Français' },
                      { value: 'Other', label: t('common.other') },
                    ])}
                    {renderEditField(t('field.numPages'), 'numPages', 'number')}
                  </>
                )}
              </div>

              {/* Column 2+3 (2/3): Authors, Unis, Companies, Rating, DOI */}
              <div className="col-span-2 space-y-2">
                {mode === 'view' ? (
                  <>
                    {renderViewField(t('field.authors'), authorsInput)}
                    {renderViewField(t('field.universities'), universitiesInput)}
                    {renderViewField(t('field.companies'), companiesInput)}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                        {t('field.rating')}
                      </label>
                      <p className="text-xl">{starBar(article.rating)} ({article.rating}/5)</p>
                    </div>
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">
                        {t('field.doi')}
                      </label>
                      {article.doi ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-gray-900 dark:text-white break-all">{article.doi}</span>
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(article.doi || '');
                              }}
                              className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
                              title={`Copy DOI: ${article.doi}`}
                            >
                              📋 Copy
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const doiUrl = article.doi?.startsWith('http')
                                    ? article.doi
                                    : `https://doi.org/${article.doi}`;
                                  await articlesApi.openUrl(doiUrl);
                                } catch (error) {
                                  console.error('Error opening DOI:', error);
                                  const doiUrl = article.doi?.startsWith('http')
                                    ? article.doi
                                    : `https://doi.org/${article.doi}`;
                                  window.open(doiUrl, '_blank');
                                }
                              }}
                              className="text-xs bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 px-2 py-0.5 rounded transition-colors whitespace-nowrap"
                              title={`Open DOI: ${article.doi}`}
                            >
                              🔗 Open
                            </button>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">Not specified</span>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {renderCommaInput(t('field.authors'), authorsInput, setAuthorsInput, 'John Doe, Jane Smith', true)}
                    {renderCommaInput(t('field.universities'), universitiesInput, setUniversitiesInput, 'MIT, Stanford')}
                    {renderCommaInput(t('field.companies'), companiesInput, setCompaniesInput, 'Google, Microsoft')}
                    <div className="mb-3">
                      <label className="block text-sm font-medium mb-1">{t('field.rating')}</label>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFormData({ ...formData, rating: star })}
                            className="text-2xl"
                          >
                            {star <= formData.rating ? '⭐' : '☆'}
                          </button>
                        ))}
                        {formData.rating > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, rating: 0 })}
                            className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>
                    {renderEditField(t('field.doi'), 'doi')}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ============= PDF SECTION ============= */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">📄 PDF</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={openPdf}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
              >
                {t('article.openPdf')}
              </button>
              <button
                onClick={() => setShowPdfPreview(!showPdfPreview)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
              >
                {showPdfPreview ? t('article.hidePreview') : t('article.showPreview')}
              </button>
              <button
                onClick={openNote}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90"
              >
                {t('article.openNote')}
              </button>

              {/* PDF Drop zone - inline à droite des boutons en mode edit */}
              {mode === 'edit' && (
                <div
                  onDrop={handlePdfDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex-1 ml-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 text-center hover:border-primary transition-colors cursor-pointer"
                >
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-green-600 font-medium text-sm">{pdfFile.name}</p>
                      <button
                        type="button"
                        onClick={() => setPdfFile(null)}
                        className="text-red-500 text-sm hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-gray-500 text-sm">{t('article.dropPdf')}</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="pdf-upload-inline"
                      />
                      <label
                        htmlFor="pdf-upload-inline"
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        {t('common.browse')}
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ============= CLASSIFICATION: Keywords & Tags ============= */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">🏷️ {t('article.classification')}</h2>
            {mode === 'view' ? (
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-3">{renderViewField(t('field.keywords'), keywordsInput)}</div>
                <div className="col-span-1">{renderViewField(t('field.tags'), tagsInput)}</div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-6">
                <div className="col-span-3">{renderCommaInput(t('field.keywords'), keywordsInput, setKeywordsInput, 'machine learning, neural networks')}</div>
                <div className="col-span-1">{renderCommaInput(t('field.tags'), tagsInput, setTagsInput, 'important, read later')}</div>
              </div>
            )}
          </section>

          {/* ============= ABSTRACT & CONCLUSION ============= */}
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">📝 {t('field.abstract')} & {t('field.conclusion')}</h2>
            {mode === 'view' ? (
              <>
                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('field.abstract')}</label>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{article.abstract || <span className="text-gray-400 italic">{t('common.notSpecified')}</span>}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('field.conclusion')}</label>
                  <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{article.conclusion || <span className="text-gray-400 italic">{t('common.notSpecified')}</span>}</p>
                </div>
              </>
            ) : (
              <>
                {renderEditField(t('field.abstract'), 'abstract', 'textarea', undefined, 5, true)}
                {renderEditField(t('field.conclusion'), 'conclusion', 'textarea', undefined, 4)}
              </>
            )}
          </section>

          {/* ============= RESEARCH CONTENT ============= */}
          <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
            <summary className="text-lg font-semibold cursor-pointer">🔬 {t('article.researchContent')}</summary>
            <div className="mt-4">
              {mode === 'view' ? (
                <>
                  {renderViewField(t('field.subjects'), subjectsInput)}
                  {renderViewField(t('field.researchQuestion'), article.researchQuestion)}
                  {renderViewField(t('field.methodology'), article.methodology)}
                  {renderViewField(t('field.dataUsed'), article.dataUsed)}
                  {renderViewField(t('field.results'), article.results)}
                  {renderViewField(t('field.limitations'), article.limitations)}
                </>
              ) : (
                <>
                  {renderCommaInput(t('field.subjects'), subjectsInput, setSubjectsInput, 'Deep Learning, Computer Vision')}
                  {renderEditField(t('field.researchQuestion'), 'researchQuestion', 'textarea', undefined, 2)}
                  {renderEditField(t('field.methodology'), 'methodology', 'textarea', undefined, 3)}
                  {renderEditField(t('field.dataUsed'), 'dataUsed', 'textarea', undefined, 2)}
                  {renderEditField(t('field.results'), 'results', 'textarea', undefined, 3)}
                  {renderEditField(t('field.limitations'), 'limitations', 'textarea', undefined, 2)}
                </>
              )}
            </div>
          </details>

          {/* ============= NOTES & COMMENTS ============= */}
          <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6" open>
            <summary className="text-lg font-semibold cursor-pointer">📌 {t('field.notes')} & {t('field.comment')}</summary>
            <div className="mt-4">
              {mode === 'view' ? (
                <>
                  {renderViewField(t('field.firstImp'), article.firstImp)}
                  {renderViewField(t('field.notes'), article.notes)}
                  {renderViewField(t('field.comment'), article.comment)}
                </>
              ) : (
                <>
                  {renderEditField(t('field.firstImp'), 'firstImp', 'textarea', undefined, 3)}
                  {renderEditField(t('field.notes'), 'notes', 'textarea', undefined, 3)}
                  {renderEditField(t('field.comment'), 'comment', 'textarea', undefined, 3)}
                </>
              )}
            </div>
          </details>

          {/* ============= METADATA ============= */}
          <section className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <p>{t('field.createdAt')}: {formatDate(article.dateAdded)}</p>
            <p>{t('field.updatedAt')}: {formatDate(article.updatedAt)}</p>
          </section>
        </div>

        {/* Error Message - Floating above bottom bar */}
        {error && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-50">
            <div className="bg-red-500 text-white px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-3 pointer-events-auto">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Success Message - Floating above bottom bar */}
        {success && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-50">
            <div className="bg-green-500 text-white px-5 py-2.5 rounded-lg shadow-lg font-medium pointer-events-auto">
              {t('article.updateSuccess')}
            </div>
          </div>
        )}

        {/* Fixed Bottom Buttons */}
        <div
          className="h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 shadow-lg z-50 flex items-center shrink-0"
        >
          <div className="flex-1 flex gap-3">
            {mode === 'view' ? (
              <>
                <button
                  onClick={() => navigate('/library')}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  ← {t('article.backToLibrary')}
                </button>
                <button
                  onClick={enterEditMode}
                  className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600"
                >
                  {t('article.edit')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={safeCancelEdit}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t('article.cancel')}
                </button>
                <button
                  onClick={saveChanges}
                  disabled={loading}
                  className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? t('article.saving') : t('article.saveChanges')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>


      {/* PDF Preview Panel */}
      {showPdfPreview && (
        <div
          className="bg-gray-100 dark:bg-gray-900 flex flex-col"
          style={{ width: `${pdfPanelWidth}%` }}
        >
          <div className="h-10 px-4 bg-gray-200 dark:bg-gray-800 flex justify-between items-center border-b border-gray-300 dark:border-gray-700 shrink-0">
            <h3 className="text-gray-900 dark:text-white font-medium">{t('article.pdfPreview')}</h3>
            <button
              onClick={() => setShowPdfPreview(false)}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            {loadingPdf ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600 dark:text-gray-400">{t('article.loadingPdf')}</p>
              </div>
            ) : pdfBase64 ? (
              <object
                data={`data:application/pdf;base64,${pdfBase64}`}
                type="application/pdf"
                className="w-full h-full"
              >
                <p className="text-gray-600 dark:text-gray-400 text-center p-4">
                  {t('article.unableToDisplayPdf')} <button onClick={openPdf} className="text-blue-500 underline">{t('article.openInExternalViewer')}</button>
                </p>
              </object>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  {t('article.noPdfAvailable')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Error Toast */}
      {pdfError && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <span>{pdfError}</span>
            <button
              onClick={() => setPdfError(null)}
              className="text-white hover:text-gray-200 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
