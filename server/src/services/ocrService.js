const logger = require('../utils/logger');

/**
 * Pluggable OCR interface for the fallback "upload a result image" flow.
 *
 * No OCR engine ships by default (to keep the base install free and light).
 * To enable image uploads, install a free OCR engine such as tesseract.js
 * and implement `extractTextFromImage` below, e.g.:
 *
 *   npm install tesseract.js --save
 *
 *   const Tesseract = require('tesseract.js');
 *   async function extractTextFromImage(filePath) {
 *     const { data } = await Tesseract.recognize(filePath, 'eng');
 *     return data.text;
 *   }
 *
 * Until then, image uploads are accepted and stored, but text extraction
 * returns null and the user is asked to enter their roll number manually
 * to complete verification (see uploadController.js).
 */
async function extractTextFromImage(filePath) {
  logger.warn(`OCR is not configured — cannot extract text from image at ${filePath}. See ocrService.js.`);
  return null;
}

module.exports = { extractTextFromImage };
