import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';
import { registerTokenGetter } from '@/shared/api/client';
import { useAuthStore } from '@/store/auth-store';

// Register token getter so API client can attach Bearer tokens
registerTokenGetter(() => useAuthStore.getState().getAccessToken());

const queryClient = new QueryClient({
 defaultOptions: {
 queries: {
 staleTime: 1000 * 60 * 5,
 retry: 1
 }
 }
});

createRoot(document.getElementById('root')!).render(
 <StrictMode>
 <QueryClientProvider client={queryClient}>
 <App />
 </QueryClientProvider>
 </StrictMode>
);
