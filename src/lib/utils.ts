/**
 * Utility functions ported from old/utils.py
 */

/**
 * Normalize text: trim, lowercase, title case
 * Equivalent to Python's normalize()
 */
export function normalize(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Clean text: remove extra whitespace, normalize line breaks
 * Equivalent to Python's clean_text()
 */
export function cleanText(text: string): string {
  if (!text) return '';

  const lines = text.split('\n');
  let cleaned = '';

  for (const line of lines) {
    const stripped = line.trim();

    // Ignore empty lines
    if (!stripped) continue;

    // If line ends with punctuation, add newline
    if (['.', '!', '?'].includes(stripped[stripped.length - 1])) {
      cleaned += stripped + '\n';
    } else {
      // Otherwise, merge with space
      cleaned += stripped + ' ';
    }
  }

  return cleaned.trim();
}

/**
 * Check and sanitize title for file names
 * Removes invalid characters for Windows file system
 * Equivalent to Python's check_title()
 */
export function checkTitle(title: string): string {
  if (!title) return '';

  const forbiddenCharsPattern = /[<>:"/\\|?*]/g;

  if (forbiddenCharsPattern.test(title)) {
    // Replace forbidden chars with dash
    const cleaned = title.replace(forbiddenCharsPattern, '-');
    return cleaned.replace(/_/g, ' ');
  }

  return title.replace(/_/g, ' ');
}

/**
 * Generate file name from ID and title
 * Format: {id} - {title}
 * Truncates if path would be too long (max 250 chars)
 * Equivalent to Python's make_name()
 */
export function makeName(id: string, title: string): string {
  const baseName = `${id} - ${title}`;
  const maxLength = 200; // Conservative limit for Windows paths

  if (baseName.length > maxLength) {
    return baseName.substring(0, maxLength);
  }

  return baseName;
}

/**
 * Get next article ID
 * Format: PAPER001, PAPER002, ...
 * Equivalent to Python's get_next_id()
 */
export function getNextId(articles: Array<{ id: string }>): string {
  if (!articles || articles.length === 0) {
    return 'PAPER001';
  }

  try {
    const lastArticle = articles[articles.length - 1];
    const lastIdNumber = parseInt(lastArticle.id.replace('PAPER', ''));
    return `PAPER${String(lastIdNumber + 1).padStart(3, '0')}`;
  } catch (error) {
    return 'PAPER001';
  }
}

/**
 * Check if article already exists (by normalized title + authors)
 * Equivalent to Python's article_exists()
 */
export function articleExists(
  articles: Array<{ title: string; authors?: Array<{ name: string }> }>,
  title: string,
  authors: string[]
): boolean {
  const normTitle = normalize(title);
  const normAuthors = authors.map(a => normalize(a));

  for (const article of articles) {
    const articleNormTitle = normalize(article.title);
    const articleAuthors = article.authors?.map(a => normalize(a.name)) || [];

    if (
      articleNormTitle === normTitle &&
      normAuthors.some(na => articleAuthors.includes(na))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Generate star rating bar
 * Example: ⭐⭐⭐☆☆ for rating 3
 */
export function starBar(rating: number): string {
  const filledStars = '⭐'.repeat(rating);
  const emptyStars = '☆'.repeat(5 - rating);
  return filledStars + emptyStars;
}

/**
 * Tailwind utility for conditional classes
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}
