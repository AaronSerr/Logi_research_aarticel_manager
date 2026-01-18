import React from 'react';
import { useArticlesStore } from '../store/articles';
import { useTranslation } from '../hooks/useTranslation';

export default function Dashboard() {
  const articles = useArticlesStore((state) => state.articles);
  const { t } = useTranslation();

  // Basic stats
  const totalArticles = articles.length;
  const readArticles = articles.filter((a) => a.read).length;
  const favoriteArticles = articles.filter((a) => a.favorite).length;
  const ratedArticles = articles.filter((a) => a.rating > 0);
  const averageRating =
    ratedArticles.length > 0
      ? (ratedArticles.reduce((sum, a) => sum + a.rating, 0) / ratedArticles.length).toFixed(1)
      : '0';

  // Additional stats
  const uniqueAuthors = new Set(articles.flatMap(a => a.authors?.map(au => au.name) || [])).size;
  const uniqueUniversities = new Set(articles.flatMap(a => a.universities?.map(u => u.name) || [])).size;
  const uniqueCompanies = new Set(articles.flatMap(a => a.companies?.map(c => c.name) || [])).size;
  const uniqueKeywords = new Set(articles.flatMap(a => a.keywords?.map(k => k.name) || [])).size;
  const uniqueSubjects = new Set(articles.flatMap(a => a.subjects?.map(s => s.name) || [])).size;

  // Articles added/updated last month
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const addedLastMonth = articles.filter(a => {
    if (!a.createdAt) return false;
    return new Date(a.createdAt) >= oneMonthAgo;
  }).length;

  const updatedLastMonth = articles.filter(a => {
    if (!a.updatedAt) return false;
    return new Date(a.updatedAt) >= oneMonthAgo;
  }).length;

  return (
    <div className="p-8">
      {/* Header with logo */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">🏠</span>
        <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title={t('dashboard.totalArticles')}
          value={totalArticles}
          icon="📚"
          color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
        />
        <StatCard
          title={t('dashboard.readArticles')}
          value={readArticles}
          icon="👁️"
          color="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
        />
        <StatCard
          title={t('dashboard.favorites')}
          value={favoriteArticles}
          icon="⭐"
          color="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
        />
        <StatCard
          title={t('dashboard.avgRating')}
          value={averageRating}
          icon="📊"
          color="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
        />
      </div>

      {/* Database Statistics */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">📊 {t('dashboard.dbStats')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-primary">{uniqueAuthors}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">👤 {t('dashboard.authors')}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-primary">{uniqueUniversities}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">🎓 {t('dashboard.universities')}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-primary">{uniqueCompanies}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">🏢 {t('dashboard.companies')}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-primary">{uniqueKeywords}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">🔑 {t('dashboard.keywords')}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-2xl font-bold text-primary">{uniqueSubjects}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">📋 {t('dashboard.subjects')}</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-300">{addedLastMonth}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">➕ {t('dashboard.added30d')}</p>
          </div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">{updatedLastMonth}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">✏️ {t('dashboard.updated30d')}</p>
          </div>
        </div>
      </div>

      {/* Welcome Text */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">
          {t('dashboard.welcome')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {t('dashboard.welcomeDesc')}
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
          <li>{t('dashboard.feature1')}</li>
          <li>{t('dashboard.feature2')}</li>
          <li>{t('dashboard.feature3')}</li>
          <li>{t('dashboard.feature4')}</li>
          <li>{t('dashboard.feature5')}</li>
        </ul>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className={`text-4xl ${color} rounded-full w-16 h-16 flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
