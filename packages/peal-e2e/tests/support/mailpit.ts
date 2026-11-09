import { Duration, Effect, Option, Schedule, Schema } from "effect";

// The emails the server sent, read from Mailpit's API: the development
// stack's, unless MAILPIT_URL names another, as CI does.
const mailpitUrl = process.env["MAILPIT_URL"] ?? "http://127.0.0.1:18025";

const SearchSchema = Schema.Struct({
  messages: Schema.Array(Schema.Struct({ ID: Schema.String })),
});

const MessageSchema = Schema.Struct({
  Subject: Schema.String,
  Text: Schema.String,
});

type Message = typeof MessageSchema.Type;

const getJson = (path: string) =>
  Effect.tryPromise(async () => {
    const response = await fetch(new URL(path, mailpitUrl));
    const body: unknown = await response.json();

    return body;
  });

const messagesTo = Effect.fn("messagesTo")(function* messagesTo(
  address: string
) {
  const query = new URLSearchParams({ query: `to:"${address}"` });

  const { messages } = yield* getJson(
    `/api/v1/search?${query.toString()}`
  ).pipe(Effect.flatMap(Schema.decodeUnknownEffect(SearchSchema)));

  return yield* Effect.all(
    messages.map(({ ID }) =>
      getJson(`/api/v1/message/${ID}`).pipe(
        Effect.flatMap(Schema.decodeUnknownEffect(MessageSchema))
      )
    )
  );
});

// The first link in the email's text, which ends with "<action>: <url>".
const linkIn = (message: Message): Option.Option<string> =>
  Option.fromNullishOr(/https?:\/\/\S+/u.exec(message.Text)?.[0]);

/**
 * The link of the email sent to `address` whose subject is `subject`. The
 * server sends after it answers, so this waits for it, up to 30 seconds.
 */
export const emailedLink = async (
  address: string,
  subject: string
): Promise<string> =>
  await Effect.runPromise(
    messagesTo(address).pipe(
      Effect.map((messages) =>
        Option.flatMap(
          Option.fromNullishOr(
            messages.find((message) => message.Subject === subject)
          ),
          linkIn
        )
      ),
      Effect.flatMap(Effect.fromOption),
      Effect.retry({ schedule: Schedule.spaced("250 millis") }),
      Effect.timeout(Duration.seconds(30))
    )
  );
