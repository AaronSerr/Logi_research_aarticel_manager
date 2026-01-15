import React from 'react';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import AddArticle from './pages/AddArticle';
import EditArticle from './pages/EditArticle';
import ArticlePage from './pages/ArticlePage';
import Settings from './pages/Settings';

const router = createHashRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'library', element: <Library /> },
      { path: 'add', element: <AddArticle /> },
      { path: 'edit/:id', element: <EditArticle /> },
      { path: 'article/:id', element: <ArticlePage /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
