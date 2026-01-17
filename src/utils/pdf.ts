import * as pdfjsLib from 'pdfjs-dist';

// Disable worker for simplicity - runs in main thread
// This is fine for just counting pages (lightweight operation)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

/**
 * Extract the number of pages from a PDF file
 * @param file - The PDF file to analyze
 * @returns The number of pages in the PDF
 */
export async function getPdfPageCount(file: File): Promise<number> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({
    data: arrayBuffer,
    // Disable worker to avoid worker configuration issues
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  }).promise;
  return pdf.numPages;
}
