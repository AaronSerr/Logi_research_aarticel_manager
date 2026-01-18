import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../../store/settings';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    sidebarCollapsed,
    hasUnsavedChanges,
    unsavedChangesCallback,
    clearUnsavedChanges,
    activeQuickFilter,
    setActiveQuickFilter,
    libraryFilterRead,
    libraryFilterFavorite,
    setLibraryFilterRead,
    setLibraryFilterFavorite,
  } = useSettingsStore();

  const { t } = useTranslation();

  // Modal state for unsaved changes warning
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  // Handle navigation with unsaved changes check
  const handleNavigation = (e: React.MouseEvent, path: string) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      setPendingPath(path);
      setShowUnsavedModal(true);
    }
  };

  // Confirm leave without saving
  const confirmLeaveWithoutSaving = () => {
    setShowUnsavedModal(false);
    clearUnsavedChanges();
    if (pendingPath) {
      navigate(pendingPath);
    }
  };

  // Confirm leave with saving
  const confirmLeaveWithSaving = async () => {
    setShowUnsavedModal(false);
    if (unsavedChangesCallback) {
      await unsavedChangesCallback();
    }
    clearUnsavedChanges();
    if (pendingPath) {
      navigate(pendingPath);
    }
  };

  // Cancel leave
  const cancelLeave = () => {
    setShowUnsavedModal(false);
    setPendingPath(null);
  };

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: '🏠' },
    { path: '/library', label: t('nav.library'), icon: '📚' },
    { path: '/add', label: t('nav.addArticle'), icon: '➕' },
  ];

  // Quick filter handler - modifies Library filters directly and navigates
  const handleQuickFilter = (filter: 'favorites' | 'read' | 'recent') => {
    if (hasUnsavedChanges) {
      setPendingPath('/library');
      setShowUnsavedModal(true);
      return;
    }

    if (filter === 'favorites') {
      // Toggle: if already 'favorites', reset to 'all'; otherwise set 'favorites'
      setLibraryFilterFavorite(libraryFilterFavorite === 'favorites' ? 'all' : 'favorites');
    } else if (filter === 'read') {
      // Toggle: if already 'read', reset to 'all'; otherwise set 'read'
      setLibraryFilterRead(libraryFilterRead === 'read' ? 'all' : 'read');
    } else if (filter === 'recent') {
      // Recent is a sort, not a filter - toggle activeQuickFilter
      setActiveQuickFilter(activeQuickFilter === 'recent' ? 'none' : 'recent');
    }

    navigate('/library');
  };

  const quickFilters = [
    { filter: 'favorites' as const, label: t('nav.favorites'), icon: '⭐', color: 'yellow' },
    { filter: 'read' as const, label: t('nav.read'), icon: '👁️', color: 'green' },
    { filter: 'recent' as const, label: t('nav.recent'), icon: '🕐', color: 'blue' },
  ];

  // Check if a quick filter is currently active (for visual feedback)
  const isFilterActive = (filter: 'favorites' | 'read' | 'recent') => {
    if (filter === 'favorites') return libraryFilterFavorite === 'favorites';
    if (filter === 'read') return libraryFilterRead === 'read';
    if (filter === 'recent') return activeQuickFilter === 'recent';
    return false;
  };

  return (
    <>
      <div
        className={cn(
          'h-screen bg-surface border-r border-border flex flex-col transition-all duration-300',
          sidebarCollapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-border h-14 flex items-center">
          {!sidebarCollapsed ? (
            <h1 className="text-lg font-bold text-primary">Research Manager 📖</h1>
          ) : (
            <div className="text-2xl text-center w-full">📖</div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavigation(e, item.path)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                  location.pathname === item.path
                    ? 'bg-primary text-white'
                    : 'hover:bg-hover text-text'
                )}
              >
                <span className="text-xl">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Quick Filters */}
          {!sidebarCollapsed && (
            <>
              <div className="mt-6 mb-2 px-3 text-sm font-semibold text-gray-500">
                {t('nav.quickFilters')}
              </div>
              <div className="space-y-1">
                {quickFilters.map((item) => (
                  <button
                    key={item.filter}
                    onClick={() => handleQuickFilter(item.filter)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                      isFilterActive(item.filter)
                        ? item.color === 'yellow'
                          ? 'bg-yellow-500 text-white'
                          : item.color === 'green'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                        : 'hover:bg-hover text-text'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Quick Filters when collapsed - show only icons */}
          {sidebarCollapsed && (
            <>
              <div className="mt-6 mb-2 mx-2 border-t border-border"></div>
              <div className="space-y-1">
                {quickFilters.map((item) => (
                  <button
                    key={item.filter}
                    onClick={() => handleQuickFilter(item.filter)}
                    title={item.label}
                    className={cn(
                      'w-full flex items-center justify-center py-2 rounded-lg transition-colors',
                      isFilterActive(item.filter)
                        ? item.color === 'yellow'
                          ? 'bg-yellow-500 text-white'
                          : item.color === 'green'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                        : 'hover:bg-hover text-text'
                    )}
                  >
                    <span className="text-xl">{item.icon}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-border">
          <Link
            to="/settings"
            onClick={(e) => handleNavigation(e, '/settings')}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-hover text-text transition-colors',
              location.pathname === '/settings' && 'bg-primary text-white'
            )}
          >
            <span className="text-xl">⚙️</span>
            {!sidebarCollapsed && <span>{t('nav.settings')}</span>}
          </Link>
        </div>
      </div>

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
    </>
  );
}
