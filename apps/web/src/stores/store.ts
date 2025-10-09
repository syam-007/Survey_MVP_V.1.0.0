import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import { runsApi } from './runsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [runsApi.reducerPath]: runsApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(runsApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
