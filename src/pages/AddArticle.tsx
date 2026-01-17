import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArticleFormData } from '../types/article';
import { articlesApi } from '../services/api';
import { useArticlesStore } from '../store/articles';
import { useSettingsStore } from '../store/settings';
import { checkTitle } from '../lib/utils';
import { getPdfPageCount } from '../utils/pdf';
import { cleanText } from '../utils/text';

export default function AddArticle() {
  const navigate = useNavigate();
  const addArticle = useArticlesStore((state) => state.addArticle);
  const { sidebarCollapsed, theme } = useSettingsStore();

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
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showNoPdfConfirm, setShowNoPdfConfirm] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setWarning(null);
    setSuccess(false);

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

    // Check if PDF is missing
    if (!pdfFile && !formData.doi?.trim()) {
      setWarning('No PDF file and no DOI provided. Are you sure you want to continue?');
      setShowNoPdfConfirm(true);
      return;
    }

    // If PDF missing but DOI present, show warning but allow
    if (!pdfFile && formData.doi?.trim()) {
      setWarning('No PDF file uploaded, but DOI is present.');
    }

    await submitArticle();
  };

  const submitArticle = async () => {
    setShowNoPdfConfirm(false);
    setWarning(null);

    try {
      setLoading(true);

      // Parse comma-separated inputs
      const authors = authorsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const keywords = keywordsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const subjects = subjectsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const tags = tagsInput.split(',').map((s) => s.trim()).filter(Boolean);
      const universities = universitiesInput.split(',').map((s) => s.trim()).filter(Boolean);
      const companies = companiesInput.split(',').map((s) => s.trim()).filter(Boolean);

      const submissionData: ArticleFormData = {
        ...formData,
        title: checkTitle(formData.title),
        authors,
        keywords,
        subjects,
        tags,
        universities,
        companies,
        pdfFile: pdfFile || undefined,
      };

      // Create article
      const newArticle = await articlesApi.create(submissionData);

      // Upload PDF if provided
      if (pdfFile) {
        await articlesApi.uploadPdf(newArticle.id, pdfFile);
      }

      // Generate Word note
      await articlesApi.generateNote(newArticle);

      // Update store
      addArticle(newArticle);

      setSuccess(true);

      // Reset form
      setTimeout(() => {
        navigate('/library');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to add article');
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

  return (
    <div className="p-8 pb-32">
      <h1 className="text-3xl font-bold mb-6">➕ Add New Article</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Author(s) (comma-separated) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={authorsInput}
                onChange={(e) => setAuthorsInput(e.target.value)}
                placeholder="John Doe, Jane Smith"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Publication Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormData({
                      ...formData,
                      date: newDate,
                      year: newDate ? parseInt(newDate.split('-')[0]) : formData.year
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div className="flex gap-4 items-end">
                <label className="flex items-center gap-2 px-3 py-[0.4rem] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg h-[42px]">
                  <input
                    type="checkbox"
                    checked={formData.read}
                    onChange={(e) => setFormData({ ...formData, read: e.target.checked })}
                    className="w-5 h-5 rounded accent-blue-600"
                    style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                  />
                  <span className="dark:text-white">Already read 👁️</span>
                </label>

                <label className="flex items-center gap-2 px-3 py-[0.4rem] border border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-lg h-[42px]">
                  <input
                    type="checkbox"
                    checked={formData.favorite}
                    onChange={(e) => setFormData({ ...formData, favorite: e.target.checked })}
                    className="w-5 h-5 rounded accent-blue-600"
                    style={{ colorScheme: theme === 'dark' ? 'dark' : 'light' }}
                  />
                  <span className="dark:text-white">Favorite ⭐</span>
                </label>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">
                  Abstract <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, abstract: cleanText(formData.abstract) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting (fix PDF copy-paste issues)"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.abstract}
                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">DOI</label>
                <input
                  type="text"
                  value={formData.doi}
                  onChange={(e) => setFormData({ ...formData, doi: e.target.value })}
                  placeholder="10.1000/xyz123"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Journal</label>
                <input
                  type="text"
                  value={formData.journal}
                  onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        </section>

        {/* PDF Upload */}
        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">📄 PDF Upload</h2>

          <div
            onDrop={handlePdfDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
          >
            {pdfFile ? (
              <div>
                <p className="text-green-600 font-medium">✅ {pdfFile.name}</p>
                <button
                  type="button"
                  onClick={() => setPdfFile(null)}
                  className="text-sm text-red-500 mt-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="mb-2">Drag & drop PDF here, or</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => e.target.files?.[0] && handlePdfSelect(e.target.files[0])}
                  className="hidden"
                  id="pdf-upload"
                />
                <label
                  htmlFor="pdf-upload"
                  className="inline-block px-4 py-2 bg-primary text-white rounded-lg cursor-pointer hover:opacity-90"
                >
                  Browse Files
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Additional Metadata (Collapsible) */}
        <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <summary className="text-xl font-semibold cursor-pointer">
            💼 Additional Information
          </summary>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Language</label>
                <select
                  value={formData.language}
                  onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="English">English</option>
                  <option value="French">French</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Number of Pages</label>
                <input
                  type="number"
                  value={formData.numPages}
                  onChange={(e) => setFormData({ ...formData, numPages: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">University(ies) (comma-separated)</label>
              <input
                type="text"
                value={universitiesInput}
                onChange={(e) => setUniversitiesInput(e.target.value)}
                placeholder="MIT, Stanford"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Company(ies) (comma-separated)</label>
              <input
                type="text"
                value={companiesInput}
                onChange={(e) => setCompaniesInput(e.target.value)}
                placeholder="Google, Microsoft"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Conclusion</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, conclusion: cleanText(formData.conclusion) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.conclusion}
                onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Keywords (comma-separated)</label>
              <input
                type="text"
                value={keywordsInput}
                onChange={(e) => setKeywordsInput(e.target.value)}
                placeholder="machine learning, neural networks"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="Mémoire de Master, PhD Thesis, Conference Paper"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </details>

        {/* Research Content (Collapsible) */}
        <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <summary className="text-xl font-semibold cursor-pointer">
            🔬 Research Content
          </summary>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Topics Covered</label>
              <input
                type="text"
                value={subjectsInput}
                onChange={(e) => setSubjectsInput(e.target.value)}
                placeholder="Deep Learning, Computer Vision"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Research Question</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, researchQuestion: cleanText(formData.researchQuestion) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.researchQuestion}
                onChange={(e) => setFormData({ ...formData, researchQuestion: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Methodology</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, methodology: cleanText(formData.methodology) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.methodology}
                onChange={(e) => setFormData({ ...formData, methodology: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Data Used</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, dataUsed: cleanText(formData.dataUsed) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.dataUsed}
                onChange={(e) => setFormData({ ...formData, dataUsed: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Results</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, results: cleanText(formData.results) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.results}
                onChange={(e) => setFormData({ ...formData, results: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Limitations</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, limitations: cleanText(formData.limitations) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.limitations}
                onChange={(e) => setFormData({ ...formData, limitations: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </details>

        {/* Notes & Comments (Collapsible) */}
        <details className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <summary className="text-xl font-semibold cursor-pointer">
            📌 Notes & Comments
          </summary>

          <div className="mt-4 space-y-4">
            <div>
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

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">First Impressions</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, firstImp: cleanText(formData.firstImp) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.firstImp}
                onChange={(e) => setFormData({ ...formData, firstImp: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Personal Notes</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, notes: cleanText(formData.notes) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Comments</label>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, comment: cleanText(formData.comment) })}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
                  title="Clean text formatting"
                >
                  🧹 Clean
                </button>
              </div>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </details>

        {/* Messages above bottom bar */}
        <div className={`fixed bottom-16 ${sidebarCollapsed ? 'left-16' : 'left-60'} right-0 flex flex-col items-center gap-2 pb-2 z-50 transition-all duration-300`}>
          {/* Error Message */}
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
              <span>❌ {error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-2 text-red-500 dark:text-red-300 hover:text-red-700 dark:hover:text-red-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-200 px-5 py-2.5 rounded-lg text-sm font-medium">
              ✅ Article added successfully! Redirecting...
            </div>
          )}

          {/* Warning Message - No PDF but has DOI */}
          {warning && !showNoPdfConfirm && (
            <div className="bg-orange-100 dark:bg-orange-900 border border-orange-400 dark:border-orange-600 text-orange-700 dark:text-orange-200 px-4 py-2 rounded-lg text-sm">
              ⚠️ {warning}
            </div>
          )}

        </div>

        {/* Submit Button - Fixed at Bottom */}
        <div className={`fixed bottom-0 h-16 ${sidebarCollapsed ? 'left-16' : 'left-60'} right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 shadow-lg z-50 transition-all duration-300 flex items-center`}>
          <div className="flex-1 flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Adding Article...' : '➕ Add Article'}
            </button>
          </div>
        </div>

        {/* No PDF/DOI Confirmation Modal */}
        {showNoPdfConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
              <h3 className="text-xl font-bold mb-4 text-orange-600 dark:text-orange-400">⚠️ Warning</h3>
              <p className="mb-6 text-gray-700 dark:text-gray-300">{warning}</p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoPdfConfirm(false);
                    setWarning(null);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitArticle}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Yes, Add Anyway
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
