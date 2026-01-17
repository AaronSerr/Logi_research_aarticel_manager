/**
 * Format a date string to DD/MM/YYYY format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a date string to DD/MM/YYYY HH:MM format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string with time
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';

  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Clean text copied from PDFs by fixing common formatting issues:
 * - Removes excessive line breaks caused by PDF column wrapping
 * - Preserves paragraph breaks (lines ending with . ! ?)
 * - Normalizes whitespace
 *
 * @param text - The text to clean
 * @returns Cleaned text with proper formatting
 */
export function cleanText(text: string): string {
  if (!text) return '';

  // Normalize Windows line endings to Unix
  text = text.replace(/\r\n/g, '\n');

  const lines = text.split('\n');
  let cleaned = '';

  for (const line of lines) {
    const stripped = line.trim();

    // Skip empty lines
    if (!stripped) continue;

    // If line ends with sentence-ending punctuation, keep the line break
    if (/[.!?]$/.test(stripped)) {
      cleaned += stripped + '\n';
    } else {
      // Otherwise, merge with space (fixes PDF line wrapping mid-sentence)
      cleaned += stripped + ' ';
    }
  }

  return cleaned.trim();
}
