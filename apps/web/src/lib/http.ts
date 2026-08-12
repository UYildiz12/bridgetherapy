export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Wraps a route handler so any unhandled rejection becomes a structured 500
 * instead of leaking an opaque framework error. The `console.error` call is the
 * single hook point where structured logging (Sentry/Datadog) can attach later.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error(err);
      return json({ error: "Internal server error" }, 500);
    }
  };
}
