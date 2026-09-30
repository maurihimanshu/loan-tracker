import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Scenario } from '../../domain/loan/types';

export interface ScenariosState {
  scenarios: Scenario[];
  selectedScenarioId: string | null;
}

const initialState: ScenariosState = {
  scenarios: [],
  selectedScenarioId: null,
};

export const scenariosSlice = createSlice({
  name: 'scenarios',
  initialState,
  reducers: {
    addScenario: (state, action: PayloadAction<Scenario>) => {
      const idx = state.scenarios.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) {
        state.scenarios[idx] = action.payload;
      } else {
        state.scenarios.push(action.payload);
      }
      if (!state.selectedScenarioId) {
        state.selectedScenarioId = action.payload.id;
      }
    },
    updateScenario: (state, action: PayloadAction<Scenario>) => {
      const idx = state.scenarios.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) {
        state.scenarios[idx] = action.payload;
      }
    },
    deleteScenario: (state, action: PayloadAction<string>) => {
      state.scenarios = state.scenarios.filter((s) => s.id !== action.payload);
      if (state.selectedScenarioId === action.payload) {
        state.selectedScenarioId = state.scenarios[0]?.id ?? null;
      }
    },
    setSelectedScenarioId: (state, action: PayloadAction<string | null>) => {
      state.selectedScenarioId = action.payload;
    },
    setAllScenarios: (state, action: PayloadAction<Scenario[]>) => {
      state.scenarios = action.payload;
      if (
        !state.selectedScenarioId ||
        !state.scenarios.some((s) => s.id === state.selectedScenarioId)
      ) {
        state.selectedScenarioId = state.scenarios[0]?.id ?? null;
      }
    },
    resetScenarios: (state) => {
      state.scenarios = [];
      state.selectedScenarioId = null;
    },
  },
});

export const {
  addScenario,
  updateScenario,
  deleteScenario,
  setSelectedScenarioId,
  setAllScenarios,
  resetScenarios,
} = scenariosSlice.actions;

export default scenariosSlice.reducer;

