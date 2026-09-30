/**
 * File System Service supporting:
 * 1. File System Access API (showOpenFilePicker, showSaveFilePicker)
 * 2. Fallback CSV download / input file upload for unsupported browsers
 */

export interface OpenFileResult {
  content: string;
  filename: string;
  handle?: FileSystemFileHandle;
}

export interface SaveFileResult {
  success: boolean;
  filename: string;
  handle?: FileSystemFileHandle;
}

/**
 * Checks if the browser natively supports the File System Access API.
 */
export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showOpenFilePicker' in window &&
    'showSaveFilePicker' in window
  );
}

/**
 * Opens a CSV file using File System Access API if supported.
 */
export async function openCsvWithPicker(): Promise<OpenFileResult> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }

  // @ts-expect-error - File System Access API types
  const [handle] = await window.showOpenFilePicker({
    types: [
      {
        description: 'CSV Files',
        accept: {
          'text/csv': ['.csv'],
        },
      },
    ],
    multiple: false,
  });

  if (!handle) {
    throw new Error('No file selected');
  }

  const file = await handle.getFile();
  const content = await file.text();

  return {
    content,
    filename: file.name,
    handle,
  };
}

interface WritableStreamSink {
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
}

interface WritableCapableHandle {
  createWritable: () => Promise<WritableStreamSink>;
}

/**
 * Saves content to an existing FileSystemFileHandle.
 */
export async function saveToExistingHandle(
  handle: FileSystemFileHandle,
  content: string,
): Promise<boolean> {
  try {
    const writableHandle = handle as unknown as WritableCapableHandle;
    const writable = await writableHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    console.error('Failed to write to existing handle:', err);
    return false;
  }
}

/**
 * Saves content using Save As picker dialog.
 */
export async function saveCsvAsWithPicker(
  content: string,
  suggestedName: string = 'loan-tracker.csv',
): Promise<SaveFileResult> {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser.');
  }

  // @ts-expect-error - File System Access API types
  const handle = await window.showSaveFilePicker({
    suggestedName,
    types: [
      {
        description: 'CSV File',
        accept: {
          'text/csv': ['.csv'],
        },
      },
    ],
  });

  const success = await saveToExistingHandle(handle, content);
  return {
    success,
    filename: handle.name,
    handle,
  };
}

/**
 * Fallback: Triggers browser download of a CSV file.
 */
export function triggerCsvDownload(
  content: string,
  filename: string = 'loan-tracker.csv',
): void {
  // Add UTF-8 BOM for Microsoft Excel compatibility
  const blob = new Blob(['\uFEFF' + content], {
    type: 'text/csv;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fallback: Reads text content from a selected HTML File object.
 */
export async function readCsvFromFileObject(file: File): Promise<string> {
  return await file.text();
}
