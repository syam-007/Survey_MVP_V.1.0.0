import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { runsApi } from './runsSlice';
import { wellsApi } from './wellsSlice';
import { jobsApi } from './jobsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [runsApi.reducerPath]: runsApi.reducer,
    [wellsApi.reducerPath]: wellsApi.reducer,
    [jobsApi.reducerPath]: jobsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(runsApi.middleware, wellsApi.middleware, jobsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
