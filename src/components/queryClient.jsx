
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // 10 minutes - increased cache
      gcTime: 15 * 60 * 1000, // 15 minutes (renamed from cacheTime)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false, // Prevent refetch spam on reconnect
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      networkMode: 'online',
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
      networkMode: 'online',
    },
  },
});
