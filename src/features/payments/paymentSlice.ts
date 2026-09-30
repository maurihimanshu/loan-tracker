import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LoanEvent } from '../../domain/loan/types';

export interface PaymentsState {
  events: LoanEvent[];
}

const initialState: PaymentsState = {
  events: [],
};

export const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    addEvent: (state, action: PayloadAction<LoanEvent>) => {
      const idx = state.events.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) {
        state.events[idx] = action.payload;
      } else {
        state.events.push(action.payload);
      }
    },
    updateEvent: (state, action: PayloadAction<LoanEvent>) => {
      const idx = state.events.findIndex((e) => e.id === action.payload.id);
      if (idx !== -1) {
        state.events[idx] = action.payload;
      }
    },
    deleteEvent: (state, action: PayloadAction<string>) => {
      state.events = state.events.filter((e) => e.id !== action.payload);
    },
    markEventAsActual: (state, action: PayloadAction<{ id: string; actualAmount?: number }>) => {
      const ev = state.events.find((e) => e.id === action.payload.id);
      if (ev) {
        ev.status = 'ACTUAL';
        if (action.payload.actualAmount !== undefined) {
          ev.amount = action.payload.actualAmount;
        }
        ev.updatedAt = new Date().toISOString();
      }
    },
    setAllEvents: (state, action: PayloadAction<LoanEvent[]>) => {
      state.events = action.payload;
    },
    resetPayments: (state) => {
      state.events = [];
    },
  },
});

export const {
  addEvent,
  updateEvent,
  deleteEvent,
  markEventAsActual,
  setAllEvents,
  resetPayments,
} = paymentsSlice.actions;

export default paymentsSlice.reducer;

