import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Quick filter types
type QuickFilter = 'none' | 'recent';
type LibraryReadFilter = 'all' | 'read' | 'unread';
type LibraryFavoriteFilter = 'all' | 'favorites' | 'non-favorites';

interface SettingsStore {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  language: string;
  pdfViewer: 'system' | 'integrated';
  fontSize: number;

  // Navigation guard for unsaved changes
  hasUnsavedChanges: boolean;
  unsavedChangesCallback: (() => void) | null;

  // Global search & quick filters
  globalSearchText: string;
  activeQuickFilter: QuickFilter;

  // Library filters (shared between Sidebar quick filters and Library page)
  libraryFilterRead: LibraryReadFilter;
  libraryFilterFavorite: LibraryFavoriteFilter;

  // Actions
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  toggleSidebar: () => void;
  setLanguage: (language: string) => void;
  setPdfViewer: (viewer: 'system' | 'integrated') => void;
  setFontSize: (size: number) => void;
  setUnsavedChanges: (hasChanges: boolean, callback?: () => void) => void;
  clearUnsavedChanges: () => void;
  setGlobalSearchText: (text: string) => void;
  setActiveQuickFilter: (filter: QuickFilter) => void;
  setLibraryFilterRead: (filter: LibraryReadFilter) => void;
  setLibraryFilterFavorite: (filter: LibraryFavoriteFilter) => void;
  clearFilters: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarCollapsed: false,
      language: 'en',
      pdfViewer: 'system',
      fontSize: 14,
      hasUnsavedChanges: false,
      unsavedChangesCallback: null,
      globalSearchText: '',
      activeQuickFilter: 'none',
      libraryFilterRead: 'all',
      libraryFilterFavorite: 'all',

      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'light' ? 'dark' : 'light',
        })),

      setTheme: (theme) => set({ theme }),

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setLanguage: (language) => set({ language }),

      setPdfViewer: (pdfViewer) => set({ pdfViewer }),

      setFontSize: (fontSize) => set({ fontSize }),

      setUnsavedChanges: (hasChanges, callback) =>
        set({ hasUnsavedChanges: hasChanges, unsavedChangesCallback: callback || null }),

      clearUnsavedChanges: () =>
        set({ hasUnsavedChanges: false, unsavedChangesCallback: null }),

      setGlobalSearchText: (text) => set({ globalSearchText: text }),

      setActiveQuickFilter: (filter) => set({ activeQuickFilter: filter }),

      setLibraryFilterRead: (filter) => set({ libraryFilterRead: filter }),

      setLibraryFilterFavorite: (filter) => set({ libraryFilterFavorite: filter }),

      clearFilters: () => set({
        globalSearchText: '',
        activeQuickFilter: 'none',
        libraryFilterRead: 'all',
        libraryFilterFavorite: 'all',
      }),
    }),
    {
      name: 'research-manager-settings',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        language: state.language,
        pdfViewer: state.pdfViewer,
        fontSize: state.fontSize,
        // Don't persist search/filters - they reset on app restart
      }),
    }
  )
);
