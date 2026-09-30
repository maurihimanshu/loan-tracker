import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FileManagementState {
  currentFileName: string | null;
  hasUnsavedChanges: boolean;
  lastFileSaveTime: string | null;
  lastLocalSaveTime: string | null;
  saveStatus: 'IDLE' | 'SAVING' | 'SAVED' | 'ERROR';
  errorMessage: string | null;
}

const initialState: FileManagementState = {
  currentFileName: null,
  hasUnsavedChanges: false,
  lastFileSaveTime: null,
  lastLocalSaveTime: null,
  saveStatus: 'IDLE',
  errorMessage: null,
};

export const fileSlice = createSlice({
  name: 'fileManagement',
  initialState,
  reducers: {
    setFileName: (state, action: PayloadAction<string | null>) => {
      state.currentFileName = action.payload;
    },
    markUnsavedChanges: (state) => {
      state.hasUnsavedChanges = true;
      state.saveStatus = 'IDLE';
    },
    markFileSaved: (state, action: PayloadAction<{ fileName?: string }>) => {
      if (action.payload.fileName) {
        state.currentFileName = action.payload.fileName;
      }
      state.hasUnsavedChanges = false;
      state.lastFileSaveTime = new Date().toLocaleTimeString();
      state.saveStatus = 'SAVED';
      state.errorMessage = null;
    },
    markLocalSaved: (state) => {
      state.lastLocalSaveTime = new Date().toLocaleTimeString();
    },
    setSaveError: (state, action: PayloadAction<string>) => {
      state.saveStatus = 'ERROR';
      state.errorMessage = action.payload;
    },
    setSaveStatus: (
      state,
      action: PayloadAction<'IDLE' | 'SAVING' | 'SAVED' | 'ERROR'>,
    ) => {
      state.saveStatus = action.payload;
    },
    resetFileState: (state) => {
      state.currentFileName = null;
      state.hasUnsavedChanges = false;
      state.lastFileSaveTime = null;
      state.saveStatus = 'IDLE';
      state.errorMessage = null;
    },
  },
});

export const {
  setFileName,
  markUnsavedChanges,
  markFileSaved,
  markLocalSaved,
  setSaveError,
  setSaveStatus,
  resetFileState,
} = fileSlice.actions;

export default fileSlice.reducer;

