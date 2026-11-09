import { Schema } from "effect";

import { ApiKeyPrincipal } from "./api-key-principal.ts";
import { UserPrincipal } from "./user-principal.ts";

/** Whoever a request authenticates as, before any workspace is involved. */
export const PrincipalSchema = Schema.Union([UserPrincipal, ApiKeyPrincipal]);

export type Principal = typeof PrincipalSchema.Type;
