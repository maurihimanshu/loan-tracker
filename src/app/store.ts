import { configureStore } from '@reduxjs/toolkit';
import loansReducer from '../features/loans/loanSlice';
import paymentsReducer from '../features/payments/paymentSlice';
import partPaymentsReducer from '../features/partPayments/partPaymentSlice';
import scenariosReducer from '../features/scenarios/scenarioSlice';
import fileManagementReducer from '../features/fileManagement/fileSlice';
import uiReducer from '../features/ui/uiSlice';

export const store = configureStore({
  reducer: {
    loans: loansReducer,
    payments: paymentsReducer,
    partPayments: partPaymentsReducer,
    scenarios: scenariosReducer,
    fileManagement: fileManagementReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

