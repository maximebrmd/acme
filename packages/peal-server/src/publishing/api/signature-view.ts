import type { Signature as SignatureView } from "peal-contract";

import type { Signature } from "#publishing/domain/signature.ts";

/** What clients see of a signature. */
export const signatureView = ({
  createdAt,
  id,
  isDefault,
  name,
  scope,
  text,
}: Signature): SignatureView => ({
  createdAt,
  id,
  isDefault,
  name,
  scope,
  text,
});
