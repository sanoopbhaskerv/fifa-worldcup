export class ProviderError extends Error {
  constructor(message, status = 502, code = "PROVIDER_ERROR", retryAfter) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

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
