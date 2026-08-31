export async function extractImageText(file: File, onProgress?: (progress: number) => void) {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', undefined, {
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress?.(message.progress);
      }
    },
  });

  try {
    const result = await worker.recognize(file);
    return result.data.text.trim();
  } finally {
    await worker.terminate();
  }
}
