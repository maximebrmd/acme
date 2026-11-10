import { Schema } from "effect";

import { errorEnvelope } from "./error-envelope.ts";

/** The link may not send people back to this address. */
export class ReturnUrlNotAllowed extends Schema.TaggedError<ReturnUrlNotAllowed>()(
  "ReturnUrlNotAllowed",
  { ...errorEnvelope },
  {
    description:
      "The return address was refused: it is not an HTTPS address (or HTTP on this machine), or its origin is not one the workspace's partner account registered. A workspace without a partner account takes no return address. Nothing was created.",
    httpApiStatus: 422,
  }
) {}
