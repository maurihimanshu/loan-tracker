import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PartPaymentOverride, PartPaymentRule } from '../../domain/loan/types';

export interface PartPaymentsState {
  rules: PartPaymentRule[];
  overrides: PartPaymentOverride[];
}

const initialState: PartPaymentsState = {
  rules: [],
  overrides: [],
};

export const partPaymentsSlice = createSlice({
  name: 'partPayments',
  initialState,
  reducers: {
    addRule: (state, action: PayloadAction<PartPaymentRule>) => {
      const idx = state.rules.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.rules[idx] = action.payload;
      } else {
        state.rules.push(action.payload);
      }
    },
    updateRule: (state, action: PayloadAction<PartPaymentRule>) => {
      const idx = state.rules.findIndex((r) => r.id === action.payload.id);
      if (idx !== -1) {
        state.rules[idx] = action.payload;
      }
    },
    deleteRule: (state, action: PayloadAction<string>) => {
      state.rules = state.rules.filter((r) => r.id !== action.payload);
    },
    addOverride: (state, action: PayloadAction<PartPaymentOverride>) => {
      // If an override for this date/loan exists, replace it
      const existingIdx = state.overrides.findIndex(
        (o) => o.loanId === action.payload.loanId && o.date === action.payload.date,
      );
      if (existingIdx !== -1) {
        state.overrides[existingIdx] = action.payload;
      } else {
        state.overrides.push(action.payload);
      }
    },
    updateOverride: (state, action: PayloadAction<PartPaymentOverride>) => {
      const idx = state.overrides.findIndex((o) => o.id === action.payload.id);
      if (idx !== -1) {
        state.overrides[idx] = action.payload;
      }
    },
    deleteOverride: (state, action: PayloadAction<string>) => {
      state.overrides = state.overrides.filter((o) => o.id !== action.payload);
    },
    setAllRules: (state, action: PayloadAction<PartPaymentRule[]>) => {
      state.rules = action.payload;
    },
    setAllOverrides: (state, action: PayloadAction<PartPaymentOverride[]>) => {
      state.overrides = action.payload;
    },
    resetPartPayments: (state) => {
      state.rules = [];
      state.overrides = [];
    },
  },
});

export const {
  addRule,
  updateRule,
  deleteRule,
  addOverride,
  updateOverride,
  deleteOverride,
  setAllRules,
  setAllOverrides,
  resetPartPayments,
} = partPaymentsSlice.actions;

export default partPaymentsSlice.reducer;

