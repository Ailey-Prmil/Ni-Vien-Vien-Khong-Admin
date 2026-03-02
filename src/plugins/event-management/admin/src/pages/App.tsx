import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ActivityListPage } from './ActivityListPage';
import { ActivityDetailPage } from './ActivityDetailPage';

export function App() {
  return (
    <Routes>
      <Route index element={<ActivityListPage />} />
      <Route path="activity/:id" element={<ActivityDetailPage />} />
    </Routes>
  );
}
