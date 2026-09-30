import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Loan } from '../../domain/loan/types';

export interface LoansState {
  loans: Loan[];
  activeLoanId: string | null;
}

const initialState: LoansState = {
  loans: [],
  activeLoanId: null,
};

export const loansSlice = createSlice({
  name: 'loans',
  initialState,
  reducers: {
    addLoan: (state, action: PayloadAction<Loan>) => {
      const exists = state.loans.some((l) => l.id === action.payload.id);
      if (exists) {
        const idx = state.loans.findIndex((l) => l.id === action.payload.id);
        state.loans[idx] = action.payload;
      } else {
        state.loans.push(action.payload);
      }
      if (!state.activeLoanId) {
        state.activeLoanId = action.payload.id;
      }
    },
    updateLoan: (state, action: PayloadAction<Loan>) => {
      const idx = state.loans.findIndex((l) => l.id === action.payload.id);
      if (idx !== -1) {
        state.loans[idx] = action.payload;
      }
    },
    deleteLoan: (state, action: PayloadAction<string>) => {
      state.loans = state.loans.filter((l) => l.id !== action.payload);
      if (state.activeLoanId === action.payload) {
        state.activeLoanId = state.loans[0]?.id ?? null;
      }
    },
    setActiveLoan: (state, action: PayloadAction<string | null>) => {
      state.activeLoanId = action.payload;
    },
    setAllLoans: (state, action: PayloadAction<Loan[]>) => {
      state.loans = action.payload;
      if (
        !state.activeLoanId ||
        !state.loans.some((l) => l.id === state.activeLoanId)
      ) {
        state.activeLoanId = state.loans[0]?.id ?? null;
      }
    },
    resetLoans: (state) => {
      state.loans = [];
      state.activeLoanId = null;
    },
  },
});

export const {
  addLoan,
  updateLoan,
  deleteLoan,
  setActiveLoan,
  setAllLoans,
  resetLoans,
} = loansSlice.actions;

export default loansSlice.reducer;
