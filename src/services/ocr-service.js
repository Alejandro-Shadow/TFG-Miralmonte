import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

/**
 * Extract text from an image file using Tesseract.js OCR
 */
export async function extractTextFromImage(file, onProgress) {
  const Tesseract = await import('tesseract.js');

  const result = await Tesseract.recognize(file, 'spa+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  return result.data.text;
}

/**
 * Extract text from a PDF file using pdfjs-dist
 */
export async function extractTextFromPDF(file, onProgress) {
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  const totalPages = pdf.numPages;

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';

    if (onProgress) {
      onProgress(Math.round((i / totalPages) * 100));
    }
  }

  return fullText.trim();
}

/**
 * Determine file type and extract text accordingly
 */
export async function extractTextFromFile(file, onProgress) {
  const type = file.type;
  const name = file.name.toLowerCase();

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractTextFromPDF(file, onProgress);
  }

  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp|tiff?)$/i.test(name)) {
    return extractTextFromImage(file, onProgress);
  }

  throw new Error('Formato de archivo no soportado. Usa una imagen o un PDF.');
}
