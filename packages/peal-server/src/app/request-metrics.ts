import { Effect, Exit, Metric } from "effect";
import { HttpMiddleware, HttpServerError } from "effect/http";

/**
 * Requests the server answered, by the class of their status (`2xx`,
 * `3xx`, `4xx`, `5xx`). Every request is counted, whereas traces are
 * sampled: the alerts on a silent or a failing server read this counter,
 * not the spans, which would show a tenth of the requests.
 */
export const httpRequests = Metric.counter("peal.http.requests", {
  description: "Requests the server answered, by status class",
  incremental: true,
});

const classOf = (status: number) => `${Math.floor(status / 100)}xx`;

/**
 * Counts each request once it is answered, with the status the client
 * gets: a failure nothing turned into an answer is a 500, as the server
 * sends it.
 */
export const countRequests = HttpMiddleware.make((httpApp) =>
  httpApp.pipe(
    Effect.onExit((exit) =>
      Metric.update(
        Metric.withAttributes(httpRequests, {
          status: classOf(
            Exit.isSuccess(exit)
              ? exit.value.status
              : HttpServerError.causeResponseStripped(exit.cause)[0].status
          ),
        }),
        1
      )
    )
  )
);
