/** Provider-facing error with HTTP status and stable application error code. */
export class ProviderError extends Error {
  /**
   * Creates a provider error that can be converted into a stable JSON API response.
   *
   * @param message - Human-readable error message.
   * @param status - HTTP status code that should be returned to the client.
   * @param code - Stable application error code.
   * @param retryAfter - Optional retry hint from an upstream provider.
   */
  constructor(message, status = 502, code = "PROVIDER_ERROR", retryAfter) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

/**
 * Converts unknown errors into JSON API error payloads.
 *
 * @param error - Unknown error thrown by provider or routing code.
 * @returns HTTP status and JSON body suitable for the API response helper.
 */
export const jsonError = (error) => {
  if (error?.name === "TimeoutError" || error?.name === "AbortError") {
    return {
      status: 504,
      body: {
        error: {
          code: "PROVIDER_TIMEOUT",
          message: "The football provider took too long to respond.",
        },
      },
    };
  }
  const status = error instanceof ProviderError ? error.status : 500;
  return {
    status,
    body: {
      error: {
        code: error instanceof ProviderError ? error.code : "INTERNAL_ERROR",
        message:
          status >= 500
            ? "Football data is temporarily unavailable."
            : error.message,
        retryAfter:
          error instanceof ProviderError ? error.retryAfter : undefined,
      },
    },
  };
};
