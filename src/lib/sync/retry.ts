// Retries a sync call on transient failures (network errors, 5xx) but not
// on things a retry can't fix -- a bad auth token (4xx) just fails faster
// and the error message correctly tells the user to reconnect instead of
// wasting three attempts on a dead refresh token.
function isRetryable(error: unknown): boolean {
  if (error instanceof TypeError) return true; // fetch-level network failure
  if (error instanceof Error) {
    return /\b5\d\d\b/.test(error.message);
  }
  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts - 1 || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500));
    }
  }
  throw lastError;
}
