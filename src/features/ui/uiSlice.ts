import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LocalDate } from '../../domain/loan/types';
import { todayLocalDate } from '../../domain/loan/dates';

export type NavigationTab =
  | 'dashboard'
  | 'loans'
  | 'payments'
  | 'partPayments'
  | 'scenarios'
  | 'schedule'
  | 'settings';

export interface UiState {
  activeTab: NavigationTab;
  asOfDate: LocalDate;
  theme: 'light' | 'dark' | 'system';
  isLoanSetupOpen: boolean;
  editingLoanId: string | null;
}

const initialState: UiState = {
  activeTab: 'dashboard',
  asOfDate: todayLocalDate(),
  theme: 'system',
  isLoanSetupOpen: false,
  editingLoanId: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<NavigationTab>) => {
      state.activeTab = action.payload;
    },
    setAsOfDate: (state, action: PayloadAction<LocalDate>) => {
      state.asOfDate = action.payload;
    },
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },
    openLoanSetup: (state, action: PayloadAction<string | null>) => {
      state.isLoanSetupOpen = true;
      state.editingLoanId = action.payload;
    },
    closeLoanSetup: (state) => {
      state.isLoanSetupOpen = false;
      state.editingLoanId = null;
    },
  },
});

export const {
  setActiveTab,
  setAsOfDate,
  setTheme,
  openLoanSetup,
  closeLoanSetup,
} = uiSlice.actions;

export default uiSlice.reducer;

