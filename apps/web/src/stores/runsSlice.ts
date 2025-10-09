import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Run,
  CreateRunInput,
  RunFilters,
  PaginatedRunResponse,
} from '../types/run.types';
import type { RootState } from './store';

const API_BASE_URL = (typeof process !== 'undefined' && process.env?.VITE_API_URL) || 'http://localhost:8000';

/**
 * Runs API Slice using RTK Query
 * Provides auto-generated hooks for run management operations
 * Based on Story 2.1 (Run Management API) and Story 2.3 (Filtering/Search/Pagination)
 */
export const runsApi = createApi({
  reducerPath: 'runsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/v1`,
    prepareHeaders: (headers, { getState }) => {
      // Get token from auth state
      const token = (getState() as RootState).auth.tokens?.access;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Run'],
  endpoints: (builder) => ({
    /**
     * Get paginated list of runs with filters
     */
    getRuns: builder.query<PaginatedRunResponse, RunFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.run_type) params.append('run_type', filters.run_type);
          if (filters.well) params.append('well', filters.well);
          if (filters.created_at_after) params.append('created_at_after', filters.created_at_after);
          if (filters.created_at_before) params.append('created_at_before', filters.created_at_before);
          if (filters.updated_at_after) params.append('updated_at_after', filters.updated_at_after);
          if (filters.updated_at_before) params.append('updated_at_before', filters.updated_at_before);
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
        }

        return {
          url: `/runs/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Run', id: 'LIST' }],
    }),

    /**
     * Get single run by ID
     */
    getRunById: builder.query<Run, string>({
      query: (id) => `/runs/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Run', id }],
    }),

    /**
     * Create new run
     */
    createRun: builder.mutation<Run, CreateRunInput>({
      query: (data) => ({
        url: '/runs/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Run', id: 'LIST' }],
    }),

    /**
     * Update run (full update)
     */
    updateRun: builder.mutation<Run, { id: string; data: CreateRunInput }>({
      query: ({ id, data }) => ({
        url: `/runs/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Run', id },
        { type: 'Run', id: 'LIST' },
      ],
    }),

    /**
     * Patch run (partial update)
     */
    patchRun: builder.mutation<Run, { id: string; data: Partial<CreateRunInput> }>({
      query: ({ id, data }) => ({
        url: `/runs/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Run', id },
        { type: 'Run', id: 'LIST' },
      ],
    }),

    /**
     * Delete run (soft delete)
     */
    deleteRun: builder.mutation<void, string>({
      query: (id) => ({
        url: `/runs/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Run', id },
        { type: 'Run', id: 'LIST' },
      ],
    }),
  }),
});

// Export auto-generated hooks
export const {
  useGetRunsQuery,
  useGetRunByIdQuery,
  useCreateRunMutation,
  useUpdateRunMutation,
  usePatchRunMutation,
  useDeleteRunMutation,
} = runsApi;
