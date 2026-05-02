import type { BookProgress } from './types';
import { getBookProgress, setBookProgress } from './db';

export async function loadBookProgress(bookId: string) {
  return getBookProgress(bookId);
}

export async function storeBookProgress(progress: BookProgress) {
  await setBookProgress(progress);
}
