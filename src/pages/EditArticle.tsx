import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Article, ArticleFormData } from '../types/article';
import { articlesApi } from '../services/api';
import { useArticlesStore } from '../store/articles';
import { useSettingsStore } from '../store/settings';
import { useTranslation } from '../hooks/useTranslation';
import { checkTitle } from '../lib/utils';
import { getPdfPageCount } from '../utils/pdf';
import { cleanText } from '../utils/text';
import { CleanTextarea } from '../components/form/CleanTextarea';

export default function EditArticle() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateArticle = useArticlesStore((state) => state.updateArticle);
  const { sidebarCollapsed, theme } = useSettingsStore();
  const { t } = useTranslation();

  const [article, setArticle] = useState<Article | null>(null);
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

  const [authorsInput, setAuthorsInput] = useState('');
  const [keywordsInput, setKeywordsInput] = useState('');
  const [subjectsInput, setSubjectsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [universitiesInput, setUniversitiesInput] = useState('');
  const [companiesInput, setCompaniesInput] = useState('');

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingArticle, setLoadingArticle] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  // PDF Preview
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);

  // Load existing article data
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

        // Populate form with existing data
        setFormData({
          title: loadedArticle.title,
          abstract: loadedArticle.abstract,
          conclusion: loadedArticle.conclusion || '',
          year: loadedArticle.year,
          date: loadedArticle.date,
          journal: loadedArticle.journal || '',
          doi: loadedArticle.doi || '',
          language: loadedArticle.language || 'English',
          numPages: loadedArticle.numPages || 0,
          researchQuestion: loadedArticle.researchQuestion || '',
          methodology: loadedArticle.methodology || '',
          dataUsed: loadedArticle.dataUsed || '',
          results: loadedArticle.results || '',
          limitations: loadedArticle.limitations || '',
          firstImp: loadedArticle.firstImp || '',
          notes: loadedArticle.notes || '',
          comment: loadedArticle.comment || '',
          rating: loadedArticle.rating,
          read: loadedArticle.read,
          favorite: loadedArticle.favorite,
          authors: loadedArticle.authors?.map(a => a.name) || [],
          keywords: loadedArticle.keywords?.map(k => k.name) || [],
          subjects: loadedArticle.subjects?.map(s => s.name) || [],
          tags: loadedArticle.tags?.map(t => t.name) || [],
          universities: loadedArticle.universities?.map(u => u.name) || [],
          companies: loadedArticle.companies?.map(c => c.name) || [],
        });

        // Convert arrays to comma-separated strings
        setAuthorsInput(loadedArticle.authors?.map(a => a.name).join(', ') || '');
        setKeywordsInput(loadedArticle.keywords?.map(k => k.name).join(', ') || '');
        setSubjectsInput(loadedArticle.subjects?.map(s => s.name).join(', ') || '');
        setTagsInput(loadedArticle.tags?.map(t => t.name).join(', ') || '');
        setUniversitiesInput(loadedArticle.universities?.map(u => u.name).join(', ') || '');
        setCompaniesInput(loadedArticle.companies?.map(c => c.name).join(', ') || '');
      } catch (err: any) {
        setError(err.message || 'Failed to load article');
      } finally {
        setLoadingArticle(false);
      }
    };

    loadArticle();
  }, [id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!id) {
      setError('No article ID');
      return;
    }

    // Validate required fields
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

      // Parse comma-separated inputs
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

      // Update article
      const updatedArticle = await articlesApi.update(id, submissionData);

      // Upload PDF if provided (uses new naming format: "PAPER001 - Title.pdf")
      if (pdfFile) {
        await articlesApi.uploadPdf(id, updatedArticle.title, pdfFile);
      }

      // Regenerate Word note with updated data
      await articlesApi.generateNote(updatedArticle);

      // Update store
      updateArticle(id, updatedArticle);
      setArticle(updatedArticle);

      setSuccess(true);

      // Redirect to article page after short delay
      setTimeout(() => {
        navigate(`/article/${id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update article');
    } finally {
      setLoading(false);
    }
  };

  const handlePdfSelect = async (file: File) => {
    setPdfFile(file);
    // Auto-extract page count from PDF
    try {
      const pageCount = await getPdfPageCount(file);
      setFormData(prev => ({ ...prev, numPages: pageCount }));
    } catch (err) {
      console.error('Could not extract page count:', err);
    }
  };

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handlePdfSelect(file);
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
        {type === 'textarea' ? (
          <>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">
                {label} {required && <span className="text-red-500">*</span>}
              </label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, [field]: cleanText(formData[field] as string) })}
                className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                title="Clean text formatting (fix PDF copy-paste issues)"
              >
                🧹 Clean
              </button>
            </div>
            <CleanTextarea
              value={formData[field] as string}
              onChange={(value) => setFormData({ ...formData, [field]: value })}
              rows={rows || 3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              required={required}
            />
          </>
        ) : (
          <>
            <label className="block text-sm font-medium mb-1">
              {label} {required && <span className="text-red-500">*</span>}
            </label>
            {type === 'select' && options ? (
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
          </>
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

  if (loadingArticle) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <p className="text-lg">Loading article...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.title) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/library')}
          className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div
        className={`flex flex-col overflow-hidden relative ${showPdfPreview ? 'w-1/2' : 'w-full'}`}
      >
        {/* ============= STICKY TITLE HEADER ============= */}
        <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 shadow-sm">
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
        </div>

        {/* Scrollable Content - stops before bottom bar (h-16 = 4rem), header is ~4.5rem */}
        <div className="overflow-y-auto p-8 pb-4" style={{ height: 'calc(100% - 4.5rem - 4rem)' }}>
          {/* Error/Success Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              Article updated successfully! Redirecting...
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ============= INFO GRID: 3 Columns ============= */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">📋 Informations</h2>
              <div className="grid grid-cols-3 gap-6">
                {/* Column 1 (1/3): ID, Date, Journal, Language, Pages */}
                <div className="space-y-2">
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">ID</label>
                    <p className="text-gray-900 dark:text-white font-mono">{id}</p>
                  </div>
                  {renderEditField('Publication Date', 'date', 'date', undefined, undefined, true)}
                  {renderEditField('Journal', 'journal')}
                  {renderEditField('Language', 'language', 'select', [
                    { value: 'English', label: 'English' },
                    { value: 'French', label: 'French' },
                    { value: 'Other', label: 'Other' },
                  ])}
                  {renderEditField('Number of Pages', 'numPages', 'number')}
                </div>

                {/* Column 2+3 (2/3): Authors, Unis, Companies, Rating, DOI */}
                <div className="col-span-2 space-y-2">
                  {renderCommaInput('Authors', authorsInput, setAuthorsInput, 'John Doe, Jane Smith', true)}
                  {renderCommaInput('Universities', universitiesInput, setUniversitiesInput, 'MIT, Stanford')}
                  {renderCommaInput('Companies', companiesInput, setCompaniesInput, 'Google, Microsoft')}
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1">Rating</label>
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
                  {renderEditField('DOI', 'doi')}
                </div>
              </div>
            </section>

            {/* ============= PDF SECTION ============= */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">📄 PDF</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openPdf}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90"
                >
                  Open PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfPreview(!showPdfPreview)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                >
                  {showPdfPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
                <button
                  type="button"
                  onClick={openNote}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90"
                >
                  Open Note
                </button>

                {/* PDF Drop zone - inline à droite des boutons */}
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
                      <span className="text-gray-500 text-sm">Drop PDF to replace</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => e.target.files?.[0] && handlePdfSelect(e.target.files[0])}
                        className="hidden"
                        id="pdf-upload-inline"
                      />
                      <label
                        htmlFor="pdf-upload-inline"
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 rounded cursor-pointer hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        Browse
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* ============= CLASSIFICATION: Keywords & Tags ============= */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">🏷️ Classification</h2>
              <div className="grid grid-cols-2 gap-6">
                {renderCommaInput('Keywords', keywordsInput, setKeywordsInput, 'machine learning, neural networks')}
                {renderCommaInput('Tags', tagsInput, setTagsInput, 'important, read later')}
              </div>
            </section>

            {/* ============= ABSTRACT & CONCLUSION ============= */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <h2 className="text-lg font-semibold mb-4">📝 Abstract & Conclusion</h2>
              {renderEditField('Abstract', 'abstract', 'textarea', undefined, 5, true)}
              {renderEditField('Conclusion', 'conclusion', 'textarea', undefined, 4)}
            </section>

            {/* ============= RESEARCH CONTENT ============= */}
            <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6">
              <summary className="text-lg font-semibold cursor-pointer">🔬 Research Content</summary>
              <div className="mt-4">
                {renderCommaInput('Topics Covered', subjectsInput, setSubjectsInput, 'Deep Learning, Computer Vision')}
                {renderEditField('Research Question', 'researchQuestion', 'textarea', undefined, 2)}
                {renderEditField('Methodology', 'methodology', 'textarea', undefined, 3)}
                {renderEditField('Data Used', 'dataUsed', 'textarea', undefined, 2)}
                {renderEditField('Results', 'results', 'textarea', undefined, 3)}
                {renderEditField('Limitations', 'limitations', 'textarea', undefined, 2)}
              </div>
            </details>

            {/* ============= NOTES & COMMENTS ============= */}
            <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6" open>
              <summary className="text-lg font-semibold cursor-pointer">📌 Notes & Comments</summary>
              <div className="mt-4">
                {renderEditField('First Impressions', 'firstImp', 'textarea', undefined, 3)}
                {renderEditField('Personal Notes', 'notes', 'textarea', undefined, 3)}
                {renderEditField('Comments', 'comment', 'textarea', undefined, 3)}
              </div>
            </details>

            {/* ============= METADATA ============= */}
            <section className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-600 dark:text-gray-400">
              <p>Created: {article?.dateAdded ? new Date(article.dateAdded).toLocaleDateString('en-US') : 'N/A'}</p>
              <p>Last updated: {article?.updatedAt ? new Date(article.updatedAt).toLocaleString('en-US') : 'N/A'}</p>
            </section>
          </form>
        </div>

        {/* Fixed Bottom Buttons */}
        <div
          className="absolute bottom-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 shadow-lg z-50 transition-all duration-300 flex items-center left-0 right-0"
        >
          <div className="flex-1 flex gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate(`/article/${id}`)}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* PDF Preview Panel - 50% width */}
      {showPdfPreview && (
          <div
            className="w-1/2 bg-gray-100 dark:bg-gray-900 flex flex-col border-l border-gray-300 dark:border-gray-700"
          >
          <div className="h-10 px-4 bg-gray-200 dark:bg-gray-800 flex justify-between items-center border-b border-gray-300 dark:border-gray-700 shrink-0">
            <h3 className="text-gray-900 dark:text-white font-medium">PDF Preview</h3>
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
                <p className="text-gray-600 dark:text-gray-400">Loading PDF...</p>
              </div>
            ) : pdfBase64 ? (
              <object
                data={`data:application/pdf;base64,${pdfBase64}`}
                type="application/pdf"
                className="w-full h-full"
              >
                <p className="text-gray-600 dark:text-gray-400 text-center p-4">
                  Unable to display PDF. <button onClick={openPdf} className="text-blue-500 underline">Open in external viewer</button>
                </p>
              </object>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-600 dark:text-gray-400 text-center">
                  No PDF available for this article.<br/>
                  Upload a PDF to enable preview.
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
