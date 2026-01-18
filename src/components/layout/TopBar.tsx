import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettingsStore } from '../../store/settings';
import { useTranslation } from '../../hooks/useTranslation';

export default function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const {
    theme,
    toggleTheme,
    toggleSidebar,
    globalSearchText,
    setGlobalSearchText,
    hasUnsavedChanges,
    unsavedChangesCallback,
    clearUnsavedChanges,
  } = useSettingsStore();

  // Modal state for unsaved changes warning
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Handle Enter key to navigate to library with search
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && globalSearchText.trim()) {
      if (location.pathname !== '/library') {
        if (hasUnsavedChanges) {
          setShowUnsavedModal(true);
        } else {
          navigate('/library');
        }
      }
    }
  };

  // Confirm leave without saving
  const confirmLeaveWithoutSaving = () => {
    setShowUnsavedModal(false);
    clearUnsavedChanges();
    navigate('/library');
  };

  // Confirm leave with saving
  const confirmLeaveWithSaving = async () => {
    setShowUnsavedModal(false);
    if (unsavedChangesCallback) {
      await unsavedChangesCallback();
    }
    clearUnsavedChanges();
    navigate('/library');
  };

  // Cancel leave
  const cancelLeave = () => {
    setShowUnsavedModal(false);
  };

  return (
    <div className="h-14 bg-surface border-b border-border flex items-center justify-between px-4">
      {/* Left: Hamburger menu */}
      <button
        onClick={toggleSidebar}
        className="p-2 hover:bg-hover rounded-lg transition-colors"
        title="Toggle sidebar"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Center: Search bar */}
      <div className="flex-1 max-w-2xl mx-4">
        <div className="relative">
          <input
            type="text"
            value={globalSearchText}
            onChange={(e) => setGlobalSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t('library.searchPlaceholder')}
            className="w-full px-4 py-2 pl-10 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          {globalSearchText && (
            <button
              onClick={() => setGlobalSearchText('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Right: Theme toggle */}
      <button
        onClick={toggleTheme}
        className="p-2 hover:bg-hover rounded-lg transition-colors"
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
            />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        )}
      </button>

      {/* Unsaved Changes Modal */}
      {showUnsavedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md">
            <h3 className="text-xl font-bold mb-4">{t('modal.unsavedChanges')}</h3>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              {t('modal.unsavedMessage')}
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={confirmLeaveWithSaving}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                {t('modal.saveAndLeave')}
              </button>
              <button
                onClick={confirmLeaveWithoutSaving}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                {t('modal.leaveWithoutSaving')}
              </button>
              <button
                onClick={cancelLeave}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
