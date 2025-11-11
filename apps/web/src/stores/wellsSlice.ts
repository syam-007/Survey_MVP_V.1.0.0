import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  Well,
  CreateWellInput,
  WellFilters,
  PaginatedWellResponse,
} from '../types/well.types';
import type { RootState } from './store';
import config from '../config/env';

const API_BASE_URL = config.apiBaseUrl;

console.log('🔧 WellsSlice - API_BASE_URL:', API_BASE_URL);

/**
 * Wells API Slice using RTK Query
 * Provides auto-generated hooks for well management operations
 * Based on Story 2.2 (Well Management API)
 */
export const wellsApi = createApi({
  reducerPath: 'wellsApi',
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
  tagTypes: ['Well'],
  endpoints: (builder) => ({
    /**
     * Get paginated list of wells with filters
     */
    getWells: builder.query<PaginatedWellResponse, WellFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();

        if (filters) {
          if (filters.well_type) params.append('well_type', filters.well_type);
          if (filters.search) params.append('search', filters.search);
          if (filters.ordering) params.append('ordering', filters.ordering);
          if (filters.page) params.append('page', filters.page.toString());
          if (filters.page_size) params.append('page_size', filters.page_size.toString());
        }

        return {
          url: `/wells/?${params.toString()}`,
        };
      },
      providesTags: () => [{ type: 'Well', id: 'LIST' }],
    }),

    /**
     * Get single well by ID with associated runs
     */
    getWellById: builder.query<Well, string>({
      query: (id) => `/wells/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Well', id }],
    }),

    /**
     * Create new well
     */
    createWell: builder.mutation<Well, CreateWellInput>({
      query: (data) => ({
        url: '/wells/',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Well', id: 'LIST' }],
    }),

    /**
     * Update well (full update)
     */
    updateWell: builder.mutation<Well, { id: string; data: CreateWellInput }>({
      query: ({ id, data }) => ({
        url: `/wells/${id}/`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Well', id },
        { type: 'Well', id: 'LIST' },
      ],
    }),

    /**
     * Delete well (CASCADE sets run.well to NULL)
     */
    deleteWell: builder.mutation<void, string>({
      query: (id) => ({
        url: `/wells/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Well', id },
        { type: 'Well', id: 'LIST' },
      ],
    }),
  }),
});

// Export auto-generated hooks
export const {
  useGetWellsQuery,
  useGetWellByIdQuery,
  useCreateWellMutation,
  useUpdateWellMutation,
  useDeleteWellMutation,
} = wellsApi;
