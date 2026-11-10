import { Effect, Layer, Match, Option } from "effect";

import { RequestMail } from "#billing/application/ports/request-mail.ts";
import type { ContractRequest } from "#billing/domain/contract-request.ts";
import { SendAuthEmail } from "#notifications/application/send-auth-email.ts";
import type { ContractRequestOutcome } from "#notifications/application/send-auth-email.ts";
import { publicUrlConfig } from "#shared/infrastructure/environment.ts";

/** The page a request's link opens, under the reader's language. */
export const confirmationPath = "/contract-request";

// What became of the request, as its acknowledgement says it.
const outcomeOf = (request: ContractRequest): ContractRequestOutcome =>
  Match.value(request.status).pipe(
    Match.when("awaitingConfirmation", (): ContractRequestOutcome => "confirm"),
    Match.when("applied", (): ContractRequestOutcome =>
      request.kind === "cancellation" ? "cancelled" : "withdrawn"
    ),
    Match.when("refused", (): ContractRequestOutcome =>
      Option.getOrElse(request.refusal, () => "nothingToCancel" as const)
    ),
    Match.orElse((): ContractRequestOutcome => "review")
  );

/**
 * Acknowledgements through the notifications context's account emails, in
 * the language of the page the request came from, their link to the web
 * app at PUBLIC_URL: the page that applies the request, with its token, or
 * the home page.
 */
export const EmailedRequestMailLive = Layer.effect(
  RequestMail,
  Effect.gen(function* EmailedRequestMailLive() {
    const emails = yield* SendAuthEmail;
    const publicUrl = yield* publicUrlConfig;

    const page = (request: ContractRequest, token: Option.Option<string>) => {
      const prefix = request.locale === "en" ? "" : `/${request.locale}`;

      return Option.match(token, {
        onNone: () => `${publicUrl}${prefix}`,
        onSome: (value) => {
          const url = new URL(`${prefix}${confirmationPath}`, publicUrl);

          url.searchParams.set("token", value);

          return url.href;
        },
      });
    };

    return RequestMail.of({
      acknowledge: (request, token) =>
        Option.match(request.email, {
          // Nowhere to write: nothing more to send.
          onNone: () => Effect.succeed(true),
          onSome: (to) =>
            emails.deliver({
              _tag: "ContractRequestAcknowledged",
              contract: Option.getOrElse(request.contract, () => ""),
              desiredAt: Option.getOrNull(request.desiredAt),
              effectiveAt: Option.getOrNull(request.effectiveAt),
              kind: request.kind,
              locale: request.locale,
              name: Option.getOrElse(request.name, () => ""),
              outcome: outcomeOf(request),
              receivedAt: request.receivedAt,
              refunded: request.refunded.pipe(
                Option.filter(({ amount }) => amount > 0),
                Option.getOrNull
              ),
              to,
              url: page(request, token),
            }),
        }),
    });
  })
);
