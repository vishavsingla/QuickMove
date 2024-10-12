'use client';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SessionTokenState {
  value: string | null;
}

const initialState: SessionTokenState = {
  value: null,
};

const sessionTokenSlice = createSlice({
  name: 'sessionToken',
  initialState,
  reducers: {
    setSessionToken: (state, action: PayloadAction<string>) => {
      state.value = action.payload;
    },
    clearSessionToken: (state) => {
      state.value = null;
    },
  },
});

export const { setSessionToken, clearSessionToken } = sessionTokenSlice.actions;
export default sessionTokenSlice.reducer;