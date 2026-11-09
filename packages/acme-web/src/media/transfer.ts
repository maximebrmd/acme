import type { SignedRequest } from "acme-contract";
import { Context, Effect } from "effect";

import { TransferFailed } from "#media/transfer-failed.ts";

/**
 * Sends bytes straight to the media store with a request the API signed,
 * reporting how many have gone as they go. Fails with the store's status,
 * or none when no answer came.
 */
export class Transfer extends Context.Service<
  Transfer,
  {
    readonly put: (
      request: SignedRequest,
      body: Blob,
      onProgress: (sentBytes: number) => void
    ) => Effect.Effect<void, TransferFailed>;
  }
>()("acme-web/media/Transfer") {}

/**
 * The browser's: XMLHttpRequest, as fetch reports no upload progress. An
 * interrupted transfer aborts its request.
 */
export const browserTransfer = Transfer.of({
  put: (request, body, onProgress) =>
    Effect.callback<undefined, TransferFailed>((resume, signal) => {
      const xhr = new XMLHttpRequest();

      xhr.open(request.method, request.url);

      // The store checks the signed headers: they go exactly as given.
      for (const [name, value] of Object.entries(request.headers)) {
        xhr.setRequestHeader(name, value);
      }

      xhr.upload.addEventListener("progress", (event) => {
        onProgress(event.loaded);
      });

      xhr.addEventListener("load", () => {
        resume(
          xhr.status >= 200 && xhr.status < 300
            ? Effect.succeed(undefined)
            : Effect.fail(new TransferFailed({ status: xhr.status }))
        );
      });

      const noAnswer = () => {
        resume(Effect.fail(new TransferFailed({ status: null })));
      };

      xhr.addEventListener("error", noAnswer);
      xhr.addEventListener("timeout", noAnswer);

      signal.addEventListener("abort", () => {
        xhr.abort();
      });

      xhr.send(body);
    }),
});
