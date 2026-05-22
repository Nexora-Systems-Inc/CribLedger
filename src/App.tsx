import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard         from '@/screens/Dashboard';
import ActiveMatchesList from '@/screens/ActiveMatch/list';
import ActiveMatch       from '@/screens/ActiveMatch';
import CreateMatch       from '@/screens/CreateMatch';
import MatchHistory      from '@/screens/MatchHistory';
import Players           from '@/screens/Players';
import PlayerProfile     from '@/screens/PlayerProfile';
import PlayerManagement  from '@/screens/PlayerManagement';
import Settlements       from '@/screens/Settlements';
import WagerInbox        from '@/screens/WagerInbox';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            30_000,
      retry:                1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/"                element={<Dashboard />} />
            <Route path="/matches"         element={<ActiveMatchesList />} />
            <Route path="/matches/:id"     element={<ActiveMatch />} />
            <Route path="/create"          element={<CreateMatch />} />
            <Route path="/history"         element={<MatchHistory />} />
            <Route path="/players"         element={<Players />} />
            <Route path="/players/:id"     element={<PlayerProfile />} />
            <Route path="/manage-players"  element={<PlayerManagement />} />
            <Route path="/settle"          element={<Settlements />} />
            <Route path="/inbox"           element={<WagerInbox />} />
            <Route path="*"               element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
