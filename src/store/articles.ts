import { create } from 'zustand';
import { Article } from '../types/article';

declare global {
  interface Window {
    electronAPI: any;
  }
}

interface ArticlesStore {
  articles: Article[];
  loading: boolean;
  error: string | null;

  // Actions
  setArticles: (articles: Article[]) => void;
  addArticle: (article: Article) => void;
  updateArticle: (id: string, article: Partial<Article>) => void;
  deleteArticle: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  loadArticles: () => Promise<void>;
}

export const useArticlesStore = create<ArticlesStore>((set) => ({
  articles: [],
  loading: false,
  error: null,

  setArticles: (articles) => set({ articles }),

  addArticle: (article) =>
    set((state) => ({ articles: [...state.articles, article] })),

  updateArticle: (id, updatedFields) =>
    set((state) => ({
      articles: state.articles.map((article) =>
        article.id === id ? { ...article, ...updatedFields } : article
      ),
    })),

  deleteArticle: (id) =>
    set((state) => ({
      articles: state.articles.filter((article) => article.id !== id),
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  loadArticles: async () => {
    set({ loading: true, error: null });
    try {
      const articles = await window.electronAPI.articles.getAll();
      set({ articles, loading: false });
    } catch (error) {
      set({ error: String(error), loading: false });
    }
  },
}));
