
import { configureStore } from '@reduxjs/toolkit';
import sessionTokenReducer from './sessionTokenSlice';

export const makeStore = () => {
  return configureStore({
    reducer: {
      sessionToken: sessionTokenReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];