import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useArticlesStore } from '../store/articles';
import { useSettingsStore } from '../store/settings';
import { useTranslation } from '../hooks/useTranslation';
import { articlesApi } from '../services/api';
import { starBar } from '../lib/utils';
import { formatDate, formatDateTime } from '../utils/text';

export default function Library() {
  const navigate = useNavigate();
  const { articles, setArticles } = useArticlesStore();
  const { t } = useTranslation();
  const {
    globalSearchText,
    setGlobalSearchText,
    activeQuickFilter,
    setActiveQuickFilter,
    libraryFilterRead,
    libraryFilterFavorite,
    setLibraryFilterRead,
    setLibraryFilterFavorite,
  } = useSettingsStore();
  const [searchText, setSearchText] = useState('');

  // Refs for filter dropdowns to auto-close them
  const searchFieldsRef = useRef<HTMLDetailsElement>(null);
  const authorsRef = useRef<HTMLDetailsElement>(null);
  const keywordsRef = useRef<HTMLDetailsElement>(null);
  const tagsRef = useRef<HTMLDetailsElement>(null);
  const universitiesRef = useRef<HTMLDetailsElement>(null);
  const companiesRef = useRef<HTMLDetailsElement>(null);
  const journalsRef = useRef<HTMLDetailsElement>(null);

  // Search field selection - which fields to search in (for local search)
  const [searchFields, setSearchFields] = useState<string[]>(['all']);

  // Range filters
  const [filterYearMin, setFilterYearMin] = useState<number | ''>('');
  const [filterYearMax, setFilterYearMax] = useState<number | ''>('');
  const [filterDateAddedMin, setFilterDateAddedMin] = useState<number | ''>('');
  const [filterDateAddedMax, setFilterDateAddedMax] = useState<number | ''>('');
  const [filterRatingMin, setFilterRatingMin] = useState<number | ''>('');
  const [filterRatingMax, setFilterRatingMax] = useState<number | ''>('');
  const [filterPagesMin, setFilterPagesMin] = useState<number | ''>('');
  const [filterPagesMax, setFilterPagesMax] = useState<number | ''>('');

  // Multi-select filters
  const [filterAuthors, setFilterAuthors] = useState<string[]>([]);
  const [filterKeywords, setFilterKeywords] = useState<string[]>([]);
  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterSubjects, setFilterSubjects] = useState<string[]>([]);
  const [filterUniversities, setFilterUniversities] = useState<string[]>([]);
  const [filterCompanies, setFilterCompanies] = useState<string[]>([]);
  const [filterJournals, setFilterJournals] = useState<string[]>([]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteArticleId, setDeleteArticleId] = useState<string>('');
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [sortColumn, setSortColumn] = useState<'id' | 'title' | 'year' | 'createdAt' | 'updatedAt' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Load articles on mount
  useEffect(() => {
    const loadArticles = async () => {
      const data = await articlesApi.getAll();
      setArticles(data);
    };
    loadArticles();
  }, [setArticles]);

  // Transfer global search text to local search field and clear global
  useEffect(() => {
    if (globalSearchText) {
      setSearchText(globalSearchText);
      setGlobalSearchText(''); // Clear global search after transferring
    }
  }, [globalSearchText, setGlobalSearchText]);

  // Sync "Recent" quick filter with "Last Update" column sorting
  useEffect(() => {
    if (activeQuickFilter === 'recent') {
      // When Recent is active, set sort to updatedAt descending
      setSortColumn('updatedAt');
      setSortDirection('desc');
    } else if (sortColumn === 'updatedAt' && activeQuickFilter === 'none') {
      // When Recent is deactivated and we were sorting by updatedAt, clear the sort
      setSortColumn(null);
    }
  }, [activeQuickFilter]);

  // Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const allRefs = [searchFieldsRef, authorsRef, keywordsRef, tagsRef, universitiesRef, companiesRef, journalsRef];
      allRefs.forEach(ref => {
        if (ref.current && ref.current.open && !ref.current.contains(event.target as Node)) {
          ref.current.open = false;
        }
      });
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get unique values for filters
  const uniqueAuthors = Array.from(new Set(articles.flatMap(a => a.authors?.map(au => au.name) || []))).sort();
  const uniqueKeywords = Array.from(new Set(articles.flatMap(a => a.keywords?.map(k => k.name) || []))).sort();
  const uniqueTags = Array.from(new Set(articles.flatMap(a => a.tags?.map(t => t.name) || []))).sort();
  const uniqueSubjects = Array.from(new Set(articles.flatMap(a => a.subjects?.map(s => s.name) || []))).sort();
  const uniqueUniversities = Array.from(new Set(articles.flatMap(a => a.universities?.map(u => u.name) || []))).sort();
  const uniqueCompanies = Array.from(new Set(articles.flatMap(a => a.companies?.map(c => c.name) || []))).sort();
  const uniqueJournals = Array.from(new Set(articles.map(a => a.journal).filter(Boolean))).sort();

  // Available search fields for local search selector
  const availableSearchFields = [
    { value: 'all', label: t('library.allFields') },
    { value: 'title', label: t('field.title') },
    { value: 'abstract', label: t('field.abstract') },
    { value: 'conclusion', label: t('field.conclusion') },
    { value: 'authors', label: t('field.authors') },
    { value: 'keywords', label: t('field.keywords') },
    { value: 'tags', label: t('field.tags') },
    { value: 'subjects', label: t('field.subjects') },
    { value: 'journal', label: t('field.journal') },
    { value: 'doi', label: t('field.doi') },
    { value: 'researchQuestion', label: t('field.researchQuestion') },
    { value: 'methodology', label: t('field.methodology') },
    { value: 'dataUsed', label: t('field.dataUsed') },
    { value: 'results', label: t('field.results') },
    { value: 'limitations', label: t('field.limitations') },
    { value: 'firstImp', label: t('field.firstImp') },
    { value: 'notes', label: t('field.notes') },
    { value: 'comment', label: t('field.comment') },
    { value: 'universities', label: t('field.universities') },
    { value: 'companies', label: t('field.companies') },
  ];

  // Helper function to search all fields of an article (for global search)
  const searchAllFields = (article: any, query: string): boolean => {
    if (!query) return true;
    const lowerQuery = query.toLowerCase();

    // Search in string fields
    const stringFields = [
      article.id,
      article.title,
      article.abstract,
      article.conclusion,
      article.journal,
      article.doi,
      article.language,
      article.researchQuestion,
      article.methodology,
      article.dataUsed,
      article.results,
      article.limitations,
      article.firstImp,
      article.notes,
      article.comment,
      article.fileName,
    ];

    for (const field of stringFields) {
      if (field && String(field).toLowerCase().includes(lowerQuery)) return true;
    }

    // Search in number fields (year, rating, numPages)
    if (article.year && String(article.year).includes(query)) return true;
    if (article.rating && String(article.rating).includes(query)) return true;
    if (article.numPages && String(article.numPages).includes(query)) return true;

    // Search in array fields
    if (article.authors?.some((a: any) => a.name?.toLowerCase().includes(lowerQuery))) return true;
    if (article.keywords?.some((k: any) => k.name?.toLowerCase().includes(lowerQuery))) return true;
    if (article.tags?.some((t: any) => t.name?.toLowerCase().includes(lowerQuery))) return true;
    if (article.subjects?.some((s: any) => s.name?.toLowerCase().includes(lowerQuery))) return true;
    if (article.universities?.some((u: any) => u.name?.toLowerCase().includes(lowerQuery))) return true;
    if (article.companies?.some((c: any) => c.name?.toLowerCase().includes(lowerQuery))) return true;

    return false;
  };

  // Helper function to search specific fields (for local search with field selector)
  const searchSpecificFields = (article: any, query: string, fields: string[]): boolean => {
    if (!query) return true;
    if (fields.includes('all')) return searchAllFields(article, query);

    const lowerQuery = query.toLowerCase();

    for (const field of fields) {
      switch (field) {
        case 'title':
          if (article.title?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'abstract':
          if (article.abstract?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'conclusion':
          if (article.conclusion?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'authors':
          if (article.authors?.some((a: any) => a.name?.toLowerCase().includes(lowerQuery))) return true;
          break;
        case 'keywords':
          if (article.keywords?.some((k: any) => k.name?.toLowerCase().includes(lowerQuery))) return true;
          break;
        case 'tags':
          if (article.tags?.some((t: any) => t.name?.toLowerCase().includes(lowerQuery))) return true;
          break;
        case 'subjects':
          if (article.subjects?.some((s: any) => s.name?.toLowerCase().includes(lowerQuery))) return true;
          break;
        case 'journal':
          if (article.journal?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'doi':
          if (article.doi?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'researchQuestion':
          if (article.researchQuestion?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'methodology':
          if (article.methodology?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'dataUsed':
          if (article.dataUsed?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'results':
          if (article.results?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'limitations':
          if (article.limitations?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'firstImp':
          if (article.firstImp?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'notes':
          if (article.notes?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'comment':
          if (article.comment?.toLowerCase().includes(lowerQuery)) return true;
          break;
        case 'universities':
          if (article.universities?.some((u: any) => u.name?.toLowerCase().includes(lowerQuery))) return true;
          break;
        case 'companies':
          if (article.companies?.some((c: any) => c.name?.toLowerCase().includes(lowerQuery))) return true;
          break;
      }
    }
    return false;
  };

  // Filter and sort articles
  const filteredArticles = articles
    .filter((article) => {
      // Search filter logic:
      // - Global search (TopBar) is transferred to local search field
      // - Local search (Library page) uses selected fields from "Search In"
      const matchesSearch = searchText ? searchSpecificFields(article, searchText, searchFields) : true;

      // Quick filter - only 'recent' remains (favorites/read are now handled by libraryFilterRead/Favorite)
      // 'recent' is handled in sorting, so it always passes filtering
      const matchesQuickFilter = true;

      // Read filter (local dropdown)
      const matchesRead =
        libraryFilterRead === 'all' ||
        (libraryFilterRead === 'read' && article.read === true) ||
        (libraryFilterRead === 'unread' && article.read === false);

      // Favorite filter (local dropdown)
      const matchesFavorite =
        libraryFilterFavorite === 'all' ||
        (libraryFilterFavorite === 'favorites' && article.favorite === true) ||
        (libraryFilterFavorite === 'non-favorites' && article.favorite === false);

      // Range filters
      const matchesYearRange =
        (filterYearMin === '' || article.year >= filterYearMin) &&
        (filterYearMax === '' || article.year <= filterYearMax);

      const matchesDateAddedRange =
        (filterDateAddedMin === '' || !article.dateAdded || new Date(article.dateAdded).getTime() >= filterDateAddedMin) &&
        (filterDateAddedMax === '' || !article.dateAdded || new Date(article.dateAdded).getTime() <= filterDateAddedMax);

      const matchesRatingRange =
        (filterRatingMin === '' || (article.rating || 0) >= filterRatingMin) &&
        (filterRatingMax === '' || (article.rating || 0) <= filterRatingMax);

      const matchesPagesRange =
        (filterPagesMin === '' || !article.numPages || article.numPages >= filterPagesMin) &&
        (filterPagesMax === '' || !article.numPages || article.numPages <= filterPagesMax);

      // Multi-select filters
      const matchesAuthors = filterAuthors.length === 0 ||
        article.authors?.some(a => filterAuthors.includes(a.name));

      const matchesKeywords = filterKeywords.length === 0 ||
        article.keywords?.some(k => filterKeywords.includes(k.name));

      const matchesTags = filterTags.length === 0 ||
        article.tags?.some(t => filterTags.includes(t.name));

      const matchesSubjects = filterSubjects.length === 0 ||
        article.subjects?.some(s => filterSubjects.includes(s.name));

      const matchesUniversities = filterUniversities.length === 0 ||
        article.universities?.some(u => filterUniversities.includes(u.name));

      const matchesCompanies = filterCompanies.length === 0 ||
        article.companies?.some(c => filterCompanies.includes(c.name));

      const matchesJournals = filterJournals.length === 0 ||
        filterJournals.includes(article.journal || '');

      const result = matchesSearch && matchesQuickFilter && matchesRead && matchesFavorite &&
             matchesYearRange && matchesDateAddedRange && matchesRatingRange && matchesPagesRange &&
             matchesAuthors && matchesKeywords && matchesTags && matchesSubjects &&
             matchesUniversities && matchesCompanies && matchesJournals;

      return result;
    })
    .sort((a, b) => {
      // If "Recent" quick filter is active, sort by updatedAt descending (last modified first)
      if (activeQuickFilter === 'recent') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA; // Most recently updated first
      }

      // Manual sorting if column is selected
      if (sortColumn) {
        let compareResult = 0;

        switch (sortColumn) {
          case 'id':
            compareResult = a.id.localeCompare(b.id, undefined, { numeric: true });
            break;
          case 'title':
            compareResult = a.title.localeCompare(b.title);
            break;
          case 'year':
            compareResult = a.year - b.year;
            break;
          case 'createdAt':
            if (a.createdAt && b.createdAt) {
              compareResult = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }
            break;
          case 'updatedAt':
            if (a.updatedAt && b.updatedAt) {
              compareResult = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
            }
            break;
        }

        return sortDirection === 'asc' ? compareResult : -compareResult;
      }

      // Default sorting: by createdAt date (most recent first), or by ID if dates are equal
      if (a.createdAt && b.createdAt) {
        const dateCompare = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (dateCompare !== 0) return dateCompare;
      }
      // Fallback: sort by ID (ascending: 1, 2, 3...)
      return a.id.localeCompare(b.id, undefined, { numeric: true });
    });

  const handleMultiSelectChange = (
    currentValues: string[],
    setValue: React.Dispatch<React.SetStateAction<string[]>>,
    option: string,
    detailsRef?: React.RefObject<HTMLDetailsElement>
  ) => {
    if (currentValues.includes(option)) {
      const newValues = currentValues.filter(v => v !== option);
      setValue(newValues);
      // Auto-close dropdown if no items selected
      if (newValues.length === 0 && detailsRef?.current) {
        detailsRef.current.open = false;
      }
    } else {
      setValue([...currentValues, option]);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteArticleId(id);
    setDeleteConfirmInput('');
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmInput !== deleteArticleId) {
      setErrorMessage('⚠️ ID mismatch. Deletion cancelled.');
      setTimeout(() => setErrorMessage(null), 5000);
      setShowDeleteConfirm(false);
      setSelectedArticle(null);
      return;
    }

    try {
      await articlesApi.delete(deleteArticleId);
      setArticles(articles.filter((a) => a.id !== deleteArticleId));
      setSelectedArticle(null);
      setShowDeleteConfirm(false);
      setDeleteConfirmInput('');
    } catch (error: any) {
      setErrorMessage('⚠️ Failed to delete article: ' + error.message);
      setTimeout(() => setErrorMessage(null), 5000);
      setShowDeleteConfirm(false);
      setSelectedArticle(null);
    }
  };


  const handleSort = (column: 'id' | 'title' | 'year' | 'createdAt' | 'updatedAt') => {
    // Special handling for 'updatedAt' column - toggle Recent quick filter
    if (column === 'updatedAt') {
      if (activeQuickFilter === 'recent') {
        // If Recent is active, clicking updatedAt deactivates it
        setActiveQuickFilter('none');
      } else {
        // If Recent is not active, clicking updatedAt activates it
        setActiveQuickFilter('recent');
      }
      return; // Let the useEffect handle the sort state
    }

    // Normal sorting for other columns
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    // Deactivate "Recent" quick filter when sorting by a column other than 'updatedAt'
    if (activeQuickFilter === 'recent') {
      setActiveQuickFilter('none');
    }
  };

  const selectedArticleData = articles.find((a) => a.id === selectedArticle);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">📚 {t('library.title')}</h1>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 rounded-lg flex items-center gap-3">
          <span className="text-red-600 dark:text-red-200 text-2xl">⚠️</span>
          <span className="text-red-800 dark:text-red-100 flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-600 dark:text-red-200 hover:text-red-800 dark:hover:text-red-100 text-xl font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('library.totalArticles')}</p>
              <p className="text-2xl font-bold mt-1">{articles.length}</p>
            </div>
            <div className="text-4xl bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full w-16 h-16 flex items-center justify-center">
              📚
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('library.read')}</p>
              <p className="text-2xl font-bold mt-1">{articles.filter((a) => a.read).length}</p>
            </div>
            <div className="text-4xl bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full w-16 h-16 flex items-center justify-center">
              👁️
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('library.favorites')}</p>
              <p className="text-2xl font-bold mt-1">{articles.filter((a) => a.favorite).length}</p>
            </div>
            <div className="text-4xl bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-full w-16 h-16 flex items-center justify-center">
              ⭐
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('library.filtered')}</p>
              <p className="text-2xl font-bold mt-1">{filteredArticles.length}</p>
            </div>
            <div className="text-4xl bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded-full w-16 h-16 flex items-center justify-center">
              🔍
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
        {/* Basic Filters - 3 columns: Search | Field Selector | Read/Favorite */}
        <div className="grid grid-cols-3 gap-4">
          {/* Column 1: Search */}
          <div>
            <label className="block text-sm font-medium mb-2">🔍 {t('library.search')}</label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t('library.searchPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Column 2: Search Fields Selector - Multi-select collapsible */}
          <div>
            <label className="block text-sm font-medium mb-2">📋 {t('library.searchIn')}</label>
            <details ref={searchFieldsRef} className="relative">
              <summary className="px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer flex justify-between items-center list-none">
                <span>
                  {searchFields.includes('all')
                    ? t('library.allFields')
                    : t('library.fieldsSelected', { count: searchFields.length })}
                </span>
                <span className="text-gray-400">▼</span>
              </summary>
              <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {/* Option "All Fields" */}
                <label className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="checkbox"
                    checked={searchFields.includes('all')}
                    onChange={() => {
                      setSearchFields(['all']);
                      // Close dropdown when selecting "All Fields"
                      if (searchFieldsRef.current) {
                        searchFieldsRef.current.open = false;
                      }
                    }}
                    className="mr-2 rounded"
                  />
                  <span className="font-medium">{t('library.allFields')}</span>
                </label>
                {/* Individual fields */}
                {availableSearchFields.filter(f => f.value !== 'all').map((field) => (
                  <label
                    key={field.value}
                    className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={searchFields.includes(field.value)}
                      onChange={() => {
                        if (searchFields.includes('all')) {
                          // Switching from "all" to specific field
                          setSearchFields([field.value]);
                        } else if (searchFields.includes(field.value)) {
                          // Removing a field
                          const newFields = searchFields.filter(f => f !== field.value);
                          if (newFields.length === 0) {
                            setSearchFields(['all']);
                            // Close dropdown when reverting to "All Fields"
                            if (searchFieldsRef.current) {
                              searchFieldsRef.current.open = false;
                            }
                          } else {
                            setSearchFields(newFields);
                          }
                        } else {
                          // Adding a field
                          setSearchFields([...searchFields, field.value]);
                        }
                      }}
                      className="mr-2 rounded"
                    />
                    {field.label}
                  </label>
                ))}
              </div>
            </details>
          </div>

          {/* Column 3: Read Status & Favorites */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-2">📖 {t('library.readStatus')}</label>
              <select
                value={libraryFilterRead}
                onChange={(e) => setLibraryFilterRead(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="all">{t('library.all')}</option>
                <option value="read">{t('library.read')}</option>
                <option value="unread">{t('library.unread')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">⭐ {t('library.favorite')}</label>
              <select
                value={libraryFilterFavorite}
                onChange={(e) => setLibraryFilterFavorite(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="all">{t('library.all')}</option>
                <option value="favorites">{t('common.yes')}</option>
                <option value="non-favorites">{t('common.no')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mt-4 w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
        >
          <span>🎛️ {t('library.advancedFilters')}</span>
          <span>{showAdvancedFilters ? '▲' : '▼'}</span>
        </button>

        {/* Advanced Filters Section */}
        {showAdvancedFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
            {/* Row 1: Publication Year & Date Added */}
            <div className="grid grid-cols-2 gap-6">
              {/* Publication Year Range */}
              <div>
              <label className="block text-sm font-medium mb-1.5">
                📅 {t('library.pubYear')}
              </label>
              <div className="px-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">{filterYearMin || Math.min(...articles.map(a => a.year)) || 1900}</span>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">{filterYearMax || Math.max(...articles.map(a => a.year)) || new Date().getFullYear()}</span>
                </div>
                <div className="flex-1 relative py-1">
                  <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="absolute h-1 bg-red-500 rounded-full"
                      style={{
                        left: `${((filterYearMin || Math.min(...articles.map(a => a.year)) || 1900) - (Math.min(...articles.map(a => a.year)) || 1900)) / ((Math.max(...articles.map(a => a.year)) || new Date().getFullYear()) - (Math.min(...articles.map(a => a.year)) || 1900)) * 100}%`,
                        right: `${100 - ((filterYearMax || Math.max(...articles.map(a => a.year)) || new Date().getFullYear()) - (Math.min(...articles.map(a => a.year)) || 1900)) / ((Math.max(...articles.map(a => a.year)) || new Date().getFullYear()) - (Math.min(...articles.map(a => a.year)) || 1900)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min={Math.min(...articles.map(a => a.year)) || 1900}
                    max={Math.max(...articles.map(a => a.year)) || new Date().getFullYear()}
                    value={filterYearMin || Math.min(...articles.map(a => a.year)) || 1900}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val <= (filterYearMax || Math.max(...articles.map(a => a.year)) || new Date().getFullYear())) {
                        setFilterYearMin(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                  <input
                    type="range"
                    min={Math.min(...articles.map(a => a.year)) || 1900}
                    max={Math.max(...articles.map(a => a.year)) || new Date().getFullYear()}
                    value={filterYearMax || Math.max(...articles.map(a => a.year)) || new Date().getFullYear()}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= (filterYearMin || Math.min(...articles.map(a => a.year)) || 1900)) {
                        setFilterYearMax(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{Math.min(...articles.map(a => a.year)) || 1900}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{Math.max(...articles.map(a => a.year)) || new Date().getFullYear()}</span>
                </div>
              </div>
            </div>

            {/* Date Added Range */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                📆 {t('library.dateAdded')}
              </label>
              <div className="px-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    {new Date(filterDateAddedMin || (articles.length > 0 ? Math.min(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : Infinity).filter(t => t !== Infinity)) : new Date().getTime())).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">
                    {new Date(filterDateAddedMax || (articles.length > 0 ? Math.max(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0)) : new Date().getTime())).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div className="flex-1 relative py-1">
                  {/* Background track */}
                  <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                    {/* Active range overlay */}
                    <div
                      className="absolute h-1 bg-red-500 rounded-full"
                      style={{
                        left: `${(() => {
                          const allDates = articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0).filter(t => t > 0);
                          if (allDates.length === 0) return 0;
                          const minTimestamp = Math.min(...allDates);
                          const maxTimestamp = Math.max(...allDates);
                          const currentMin = filterDateAddedMin || minTimestamp;
                          return ((currentMin - minTimestamp) / (maxTimestamp - minTimestamp)) * 100;
                        })()}%`,
                        right: `${(() => {
                          const allDates = articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0).filter(t => t > 0);
                          if (allDates.length === 0) return 0;
                          const minTimestamp = Math.min(...allDates);
                          const maxTimestamp = Math.max(...allDates);
                          const currentMax = filterDateAddedMax || maxTimestamp;
                          return 100 - ((currentMax - minTimestamp) / (maxTimestamp - minTimestamp)) * 100;
                        })()}%`
                      }}
                    ></div>
                  </div>
                  {/* Min handle */}
                  <input
                    type="range"
                    min={articles.length > 0 ? Math.min(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : Infinity).filter(t => t !== Infinity)) : new Date().getTime()}
                    max={articles.length > 0 ? Math.max(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0)) : new Date().getTime()}
                    value={filterDateAddedMin || (articles.length > 0 ? Math.min(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : Infinity).filter(t => t !== Infinity)) : new Date().getTime())}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const maxVal = filterDateAddedMax || (articles.length > 0 ? Math.max(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0)) : new Date().getTime());
                      if (val <= maxVal) {
                        setFilterDateAddedMin(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                  {/* Max handle */}
                  <input
                    type="range"
                    min={articles.length > 0 ? Math.min(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : Infinity).filter(t => t !== Infinity)) : new Date().getTime()}
                    max={articles.length > 0 ? Math.max(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0)) : new Date().getTime()}
                    value={filterDateAddedMax || (articles.length > 0 ? Math.max(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0)) : new Date().getTime())}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      const minVal = filterDateAddedMin || (articles.length > 0 ? Math.min(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : Infinity).filter(t => t !== Infinity)) : new Date().getTime());
                      if (val >= minVal) {
                        setFilterDateAddedMax(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(articles.length > 0 ? Math.min(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : Infinity).filter(t => t !== Infinity)) : new Date().getTime()).toLocaleDateString('fr-FR')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(articles.length > 0 ? Math.max(...articles.map(a => a.dateAdded ? new Date(a.dateAdded).getTime() : 0)) : new Date().getTime()).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </div>
            </div>

            {/* Row 2: Rating & Number of Pages */}
            <div className="grid grid-cols-2 gap-6">
            {/* Rating Range */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                ⭐ {t('library.rating')}
              </label>
              <div className="px-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">{filterRatingMin || 0} ⭐</span>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">{filterRatingMax || 5} ⭐</span>
                </div>
                <div className="flex-1 relative py-1">
                  <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="absolute h-1 bg-red-500 rounded-full"
                      style={{
                        left: `${((filterRatingMin || 0) / 5) * 100}%`,
                        right: `${100 - ((filterRatingMax || 5) / 5) * 100}%`
                      }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={filterRatingMin || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val <= (filterRatingMax || 5)) {
                        setFilterRatingMin(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={filterRatingMax || 5}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= (filterRatingMin || 0)) {
                        setFilterRatingMax(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">0 ⭐</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">5 ⭐</span>
                </div>
              </div>
            </div>

            {/* Number of Pages Range */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                📄 {t('library.numPages')}
              </label>
              <div className="px-2">
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">{filterPagesMin || 0}</span>
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">{filterPagesMax || Math.max(...articles.map(a => a.numPages || 0)) || 1000}</span>
                </div>
                <div className="flex-1 relative py-1">
                  <div className="relative h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                    <div
                      className="absolute h-1 bg-red-500 rounded-full"
                      style={{
                        left: `${((filterPagesMin || 0) / (Math.max(...articles.map(a => a.numPages || 0)) || 1000)) * 100}%`,
                        right: `${100 - ((filterPagesMax || Math.max(...articles.map(a => a.numPages || 0)) || 1000) / (Math.max(...articles.map(a => a.numPages || 0)) || 1000)) * 100}%`
                      }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(...articles.map(a => a.numPages || 0)) || 1000}
                    value={filterPagesMin || 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val <= (filterPagesMax || Math.max(...articles.map(a => a.numPages || 0)) || 1000)) {
                        setFilterPagesMin(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                  <input
                    type="range"
                    min="0"
                    max={Math.max(...articles.map(a => a.numPages || 0)) || 1000}
                    value={filterPagesMax || Math.max(...articles.map(a => a.numPages || 0)) || 1000}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val >= (filterPagesMin || 0)) {
                        setFilterPagesMax(val);
                      }
                    }}
                    className="absolute w-full top-0 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:shadow-xl [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:mt-[-1.5px] [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-red-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:cursor-grab [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:hover:shadow-xl [&::-moz-range-thumb]:transition-shadow"
                  />
                </div>
                <div className="flex justify-between mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400">0</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{Math.max(...articles.map(a => a.numPages || 0)) || 1000}</span>
                </div>
              </div>
            </div>
            </div>

            {/* Row 3: Author, Keyword, Tag - Multi-Select */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">👤 {t('field.authors')} ({filterAuthors.length})</label>
                <details ref={authorsRef} className="relative">
                  <summary className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors list-none flex justify-between items-center">
                    <span className="text-sm">{filterAuthors.length > 0 ? t('library.selected', { count: filterAuthors.length }) : t('library.allAuthors')}</span>
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {uniqueAuthors.map(author => (
                      <label key={author} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white">
                        <input
                          type="checkbox"
                          checked={filterAuthors.includes(author)}
                          onChange={() => handleMultiSelectChange(filterAuthors, setFilterAuthors, author, authorsRef)}
                          className="rounded accent-blue-600"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-sm">{author}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🔑 {t('field.keywords')} ({filterKeywords.length})</label>
                <details ref={keywordsRef} className="relative">
                  <summary className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors list-none flex justify-between items-center">
                    <span className="text-sm">{filterKeywords.length > 0 ? t('library.selected', { count: filterKeywords.length }) : t('library.allKeywords')}</span>
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {uniqueKeywords.map(keyword => (
                      <label key={keyword} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white">
                        <input
                          type="checkbox"
                          checked={filterKeywords.includes(keyword)}
                          onChange={() => handleMultiSelectChange(filterKeywords, setFilterKeywords, keyword, keywordsRef)}
                          className="rounded accent-blue-600"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-sm">{keyword}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🏷️ {t('field.tags')} ({filterTags.length})</label>
                <details ref={tagsRef} className="relative">
                  <summary className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors list-none flex justify-between items-center">
                    <span className="text-sm">{filterTags.length > 0 ? t('library.selected', { count: filterTags.length }) : t('library.allTags')}</span>
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {uniqueTags.map(tag => (
                      <label key={tag} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white">
                        <input
                          type="checkbox"
                          checked={filterTags.includes(tag)}
                          onChange={() => handleMultiSelectChange(filterTags, setFilterTags, tag, tagsRef)}
                          className="rounded accent-blue-600"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-sm">{tag}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Row 4: Universities, Companies, Journals - Multi-Select */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">🎓 {t('field.universities')} ({filterUniversities.length})</label>
                <details ref={universitiesRef} className="relative">
                  <summary className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors list-none flex justify-between items-center">
                    <span className="text-sm">{filterUniversities.length > 0 ? t('library.selected', { count: filterUniversities.length }) : t('library.allUniversities')}</span>
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {uniqueUniversities.map(university => (
                      <label key={university} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white">
                        <input
                          type="checkbox"
                          checked={filterUniversities.includes(university)}
                          onChange={() => handleMultiSelectChange(filterUniversities, setFilterUniversities, university, universitiesRef)}
                          className="rounded accent-blue-600"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-sm">{university}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">🏢 {t('field.companies')} ({filterCompanies.length})</label>
                <details ref={companiesRef} className="relative">
                  <summary className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors list-none flex justify-between items-center">
                    <span className="text-sm">{filterCompanies.length > 0 ? t('library.selected', { count: filterCompanies.length }) : t('library.allCompanies')}</span>
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {uniqueCompanies.map(company => (
                      <label key={company} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white">
                        <input
                          type="checkbox"
                          checked={filterCompanies.includes(company)}
                          onChange={() => handleMultiSelectChange(filterCompanies, setFilterCompanies, company, companiesRef)}
                          className="rounded accent-blue-600"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-sm">{company}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">📰 {t('field.journal')} ({filterJournals.length})</label>
                <details ref={journalsRef} className="relative">
                  <summary className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors list-none flex justify-between items-center">
                    <span className="text-sm">{filterJournals.length > 0 ? t('library.selected', { count: filterJournals.length }) : t('library.allJournals')}</span>
                    <span className="text-xs">▼</span>
                  </summary>
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {uniqueJournals.map(journal => (
                      <label key={journal} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer dark:text-white">
                        <input
                          type="checkbox"
                          checked={filterJournals.includes(journal)}
                          onChange={() => handleMultiSelectChange(filterJournals, setFilterJournals, journal, journalsRef)}
                          className="rounded accent-blue-600"
                          style={{ colorScheme: 'dark' }}
                        />
                        <span className="text-sm">{journal}</span>
                      </label>
                    ))}
                  </div>
                </details>
              </div>
            </div>

            {/* Clear Advanced Filters */}
            <button
              onClick={() => {
                setFilterYearMin('');
                setFilterYearMax('');
                setFilterDateAddedMin('');
                setFilterDateAddedMax('');
                setFilterRatingMin('');
                setFilterRatingMax('');
                setFilterPagesMin('');
                setFilterPagesMax('');
                setFilterAuthors([]);
                setFilterKeywords([]);
                setFilterTags([]);
                setFilterSubjects([]);
                setFilterUniversities([]);
                setFilterCompanies([]);
                setFilterJournals([]);
              }}
              className="w-full px-4 py-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-100 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 text-sm font-medium"
            >
              {t('library.clearAdvanced')}
            </button>
          </div>
        )}
      </div>

      {/* Articles Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('id')}
              >
                ID {sortColumn === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('title')}
              >
                {t('field.title')} {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('field.authors')}</th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('year')}
              >
                {t('field.year')} {sortColumn === 'year' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('field.journal')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('library.status')}</th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                onClick={() => handleSort('createdAt')}
              >
                {t('library.dateAdded')} {sortColumn === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th
                className={`px-4 py-3 text-left text-xs font-medium uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 ${
                  activeQuickFilter === 'recent'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
                onClick={() => handleSort('updatedAt')}
              >
                {t('library.lastUpdate')} {sortColumn === 'updatedAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                {activeQuickFilter === 'recent' && ' 🕐'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredArticles.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  {t('library.noArticles')}
                </td>
              </tr>
            ) : (
              filteredArticles.map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => setSelectedArticle(article.id)}
                >
                  <td className="px-4 py-3 text-sm">{article.id}</td>
                  <td className="px-4 py-3 text-sm font-medium">
                    {article.favorite && '⭐ '}
                    {article.title}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {article.authors?.map((a) => a.name).join(', ') || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm">{article.year}</td>
                  <td className="px-4 py-3 text-sm">{article.journal || '-'}</td>
                  <td className="px-4 py-3 text-sm">
                    {article.read ? `👁️ ${t('library.read')}` : `📌 ${t('library.unread')}`}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(article.dateAdded)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(article.updatedAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Article Detail Modal */}
      {selectedArticleData && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedArticle(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Contenu scrollable */}
            <div className="overflow-y-auto flex-1 p-6 pb-24">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold">
                  {selectedArticleData.favorite && '⭐ '}
                  {selectedArticleData.title}
                </h2>
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Métadonnées en grille 2 colonnes (1/3 - 2/3) */}
                <div className="grid grid-cols-3 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                  {/* Colonne gauche - 1/3 */}
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>📋 ID:</strong> {selectedArticleData.id}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>📅 Date:</strong> {formatDate(selectedArticleData.date)}
                    </p>
                    {selectedArticleData.journal && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>📰 Journal:</strong> {selectedArticleData.journal}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>🌐 Language:</strong> {selectedArticleData.language || 'English'}
                    </p>
                    {selectedArticleData.numPages > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        <strong>📄 Pages:</strong> {selectedArticleData.numPages}
                      </p>
                    )}
                  </div>

                  {/* Colonne droite - 2/3 */}
                  <div className="col-span-2 space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                      <strong>👤 Authors:</strong>{' '}
                      {selectedArticleData.authors?.map((a) => a.name).join(', ')}
                    </p>
                    {selectedArticleData.universities && selectedArticleData.universities.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        <strong>🎓 Universities:</strong>{' '}
                        {selectedArticleData.universities.map((u) => u.name).join(', ')}
                      </p>
                    )}
                    {selectedArticleData.companies && selectedArticleData.companies.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        <strong>🏢 Companies:</strong>{' '}
                        {selectedArticleData.companies.map((c) => c.name).join(', ')}
                      </p>
                    )}
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      <strong>⭐ Rating:</strong> {starBar(selectedArticleData.rating)} (
                      {selectedArticleData.rating}/5)
                    </p>
                    {selectedArticleData.doi && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          <strong>🔗 DOI:</strong>
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedArticleData.doi || '');
                          }}
                          className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 px-2 py-0.5 rounded transition-colors"
                          title={`Copy DOI: ${selectedArticleData.doi}`}
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const doiUrl = selectedArticleData.doi?.startsWith('http')
                                ? selectedArticleData.doi
                                : `https://doi.org/${selectedArticleData.doi}`;

                              // Try to use the API first
                              if (window.electronAPI?.files?.openUrl) {
                                await articlesApi.openUrl(doiUrl);
                              } else {
                                // Fallback to window.open if API not available
                                window.open(doiUrl, '_blank');
                              }
                            } catch (error: any) {
                              console.error('Error opening DOI:', error);
                              // Fallback to window.open on error
                              const doiUrl = selectedArticleData.doi?.startsWith('http')
                                ? selectedArticleData.doi
                                : `https://doi.org/${selectedArticleData.doi}`;
                              window.open(doiUrl, '_blank');
                            }
                          }}
                          className="text-xs bg-blue-500 dark:bg-blue-600 text-white hover:bg-blue-600 dark:hover:bg-blue-700 px-2 py-0.5 rounded transition-colors"
                          title={`Open DOI: ${selectedArticleData.doi}`}
                        >
                          🔗 Open
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section Classification avec badges */}
                {((selectedArticleData.keywords && selectedArticleData.keywords.length > 0) ||
                  (selectedArticleData.tags && selectedArticleData.tags.length > 0) ||
                  (selectedArticleData.subjects && selectedArticleData.subjects.length > 0)) && (
                  <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold mb-3">🏷️ Classification</h3>
                    <div className="space-y-3">
                      {/* Keywords et Subjects sur la même ligne (4/5 - 1/5) */}
                      {((selectedArticleData.keywords && selectedArticleData.keywords.length > 0) ||
                        (selectedArticleData.subjects && selectedArticleData.subjects.length > 0)) && (
                        <div className="flex gap-4">
                          {/* Keywords - 4/5 de la ligne */}
                          {selectedArticleData.keywords && selectedArticleData.keywords.length > 0 && (
                            <div className="flex-[4] pr-4 border-r border-gray-300 dark:border-gray-600">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                Keywords
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {selectedArticleData.keywords.map((kw) => (
                                  <span
                                    key={kw.id}
                                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs"
                                  >
                                    {kw.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Subjects - 1/5 de la ligne */}
                          {selectedArticleData.subjects && selectedArticleData.subjects.length > 0 && (
                            <div className="flex-1">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                                Subjects
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {selectedArticleData.subjects.map((subject) => (
                                  <span
                                    key={subject.id}
                                    className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs"
                                  >
                                    {subject.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Tags sur sa propre ligne */}
                      {selectedArticleData.tags && selectedArticleData.tags.length > 0 && (
                        <div>
                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                            Tags
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {selectedArticleData.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs"
                              >
                                {tag.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">Abstract</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedArticleData.abstract}
                  </p>
                </div>

                {/* Last modification */}
                {selectedArticleData.updatedAt && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    🕒 Last modified: {formatDateTime(selectedArticleData.updatedAt)}
                  </p>
                )}

                {/* Notes indicator */}
                <div className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {selectedArticleData.notes ? (
                    <p>📝 Notes are available for this article.</p>
                  ) : (
                    <p>📝 You haven't written any notes for this article yet.</p>
                  )}
                </div>

                {/* Modal Error Message (Orange for PDF/Note errors) */}
                {modalError && (
                  <div className="mb-4 p-3 bg-orange-100 dark:bg-orange-900 border border-orange-400 dark:border-orange-600 rounded-lg flex items-center gap-3">
                    <span className="text-orange-600 dark:text-orange-200 text-xl">⚠️</span>
                    <span className="text-orange-800 dark:text-orange-100 flex-1 text-sm">{modalError}</span>
                    <button
                      onClick={() => setModalError(null)}
                      className="text-orange-600 dark:text-orange-200 hover:text-orange-800 dark:hover:text-orange-100 text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>

              {/* Boutons d'action groupés - Position absolue en bas */}
              <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 shadow-lg z-20">
                  <div className="flex gap-4 justify-between items-center flex-wrap">
                    <div className="flex gap-4 flex-wrap">
                      {/* Groupe 1: Fichiers + Edit */}
                      <div className="flex gap-2 pr-3 border-r border-gray-300 dark:border-gray-600">
                        <button
                          onClick={async () => {
                            try {
                              setModalError(null);
                              await articlesApi.openPdf(selectedArticleData.id);
                            } catch (error: any) {
                              setModalError('Failed to open PDF: ' + error.message);
                              setTimeout(() => setModalError(null), 5000);
                            }
                          }}
                          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                          📄 Open PDF
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              setModalError(null);
                              await articlesApi.openNote(selectedArticleData.id);
                            } catch (error: any) {
                              setModalError('Failed to open note: ' + error.message);
                              setTimeout(() => setModalError(null), 5000);
                            }
                          }}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                          📝 Open Note
                        </button>
                        <button
                          onClick={() => navigate(`/article/${selectedArticleData.id}`)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                        >
                          👁️ View / Edit
                        </button>
                      </div>

                      {/* Groupe 2: Statut */}
                      <div className="flex gap-2">
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const newReadStatus = !selectedArticleData.read;
                              await articlesApi.update(selectedArticleData.id, {
                                read: newReadStatus,
                              });
                              setArticles(
                                articles.map((a) =>
                                  a.id === selectedArticleData.id ? { ...a, read: newReadStatus } : a
                                )
                              );
                            } catch (error: any) {
                              setModalError('Failed to update read status: ' + error.message);
                              setTimeout(() => setModalError(null), 5000);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg hover:opacity-90 transition-opacity ${
                            selectedArticleData.read
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-400 dark:bg-gray-600 text-white'
                          }`}
                        >
                          {selectedArticleData.read ? '👁️ Read' : '📌 Unread'}
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const newFavoriteStatus = !selectedArticleData.favorite;
                              await articlesApi.update(selectedArticleData.id, {
                                favorite: newFavoriteStatus,
                              });
                              setArticles(
                                articles.map((a) =>
                                  a.id === selectedArticleData.id ? { ...a, favorite: newFavoriteStatus } : a
                                )
                              );
                            } catch (error: any) {
                              setModalError('Failed to update favorite status: ' + error.message);
                              setTimeout(() => setModalError(null), 5000);
                            }
                          }}
                          className={`px-4 py-2 rounded-lg hover:opacity-90 transition-opacity ${
                            selectedArticleData.favorite
                              ? 'bg-yellow-500 text-white'
                              : 'bg-gray-400 dark:bg-gray-600 text-white'
                          }`}
                        >
                          {selectedArticleData.favorite ? '⭐ Favorite' : '☆ Not Favorite'}
                        </button>
                      </div>
                    </div>

                    {/* Groupe 3: Destructif (aligné à droite) */}
                    <button
                      onClick={() => handleDeleteClick(selectedArticleData.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => {
            setShowDeleteConfirm(false);
            setDeleteConfirmInput('');
          }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Delete Article
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Are you sure you want to delete this article? This action is <strong>permanent</strong> and cannot be undone.
              </p>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800 dark:text-red-200">
                  To confirm deletion, please type the article ID below:
                </p>
                <p className="text-lg font-mono font-bold text-red-600 dark:text-red-400 mt-1">
                  {deleteArticleId}
                </p>
              </div>
              <input
                type="text"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="Type article ID here"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmInput('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmInput !== deleteArticleId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Article
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
