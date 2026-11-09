import {
  Api,
  CurrentPrincipal,
  Forbidden,
  Unauthenticated,
} from "peal-contract";
import type { Me } from "peal-contract";
import { Effect, Option } from "effect";
import { HttpApiBuilder } from "effect/http-api";

import { Accounts } from "#workspace/application/accounts.ts";
import type { CurrentAccount } from "#workspace/application/accounts.ts";

import { userPrincipalOf } from "./principal.ts";

const toMe = ({ account, principal, workspaces }: CurrentAccount): Me => ({
  impersonatedBy: Option.getOrNull(principal.impersonatedBy),
  user: {
    email: account.email,
    emailVerified: account.emailVerified,
    id: account.id,
    image: Option.getOrNull(account.image),
    locale: account.locale,
    name: account.name,
  },
  workspaces: workspaces.map(({ membership, permissions }) => ({
    id: membership.id,
    name: membership.name,
    permissions,
    role: membership.role,
    slug: membership.slug,
  })),
});

export const SessionHandlers = HttpApiBuilder.group(
  Api,
  "session",
  Effect.fn(function* sessionHandlers(handlers) {
    const accounts = yield* Accounts;

    return handlers.handleAll({
      me: () =>
        Effect.gen(function* me() {
          const principal = yield* CurrentPrincipal;

          // An API key belongs to a workspace, not to anyone.
          if (principal._tag !== "user") {
            return yield* new Forbidden();
          }

          const current = yield* accounts
            .current(userPrincipalOf(principal))
            .pipe(
              Effect.catchTags({
                BannedUser: () => Effect.fail(new Forbidden()),
                DirectoryUnavailable: Effect.die,
                NotSignedIn: () => Effect.fail(new Unauthenticated()),
              })
            );

          return toMe(current);
        }),
    });
  })
);
