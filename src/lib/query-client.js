import { QueryClient } from '@tanstack/react-query';


export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			retry: 1,
			staleTime: 5 * 60 * 1000,       // 5 min default — prevents redundant re-fetches
			gcTime: 10 * 60 * 1000,          // keep unused cache for 10 min
			refetchOnMount: false,            // use cache if still fresh
		},
	},
});