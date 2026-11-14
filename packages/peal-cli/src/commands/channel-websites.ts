import { Console, Effect, Redacted } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { ChannelSchema, SitePlatformSchema } from "peal-contract";

import { explain } from "#explain.ts";
import { jsonFlag, printJson } from "#json.ts";
import { readSecret } from "#secret-input.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

/** peal channels connect-website: a website, to publish articles to. */
export const connectWebsite = Command.make(
  "connect-website",
  {
    address: Argument.String("address").pipe(
      Argument.withDescription(
        "The site's home page, such as https://blog.example.com."
      )
    ),
    json: jsonFlag,
    platform: Flag.Literals("platform", [SitePlatformSchema.literal]).pipe(
      Flag.withDescription("What the site runs: wordpress."),
      Flag.withDefault("wordpress" as const)
    ),
    user: Flag.String("user").pipe(
      Flag.withMetavar("<login>"),
      Flag.withDescription(
        "The login name of the site's user Peal publishes as: an Author, an Editor or an Administrator."
      )
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("channels.connectWebsite")(function* connectWebsiteCommand(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    // Never an argument: typed without echo, or piped in.
    const password = yield* readSecret("The application password:");

    const channel = yield* client.channels
      .connectSite({
        params: { workspaceId: workspace.id },
        payload: {
          address: input.address,
          applicationPassword: Redacted.value(password),
          platform: input.platform,
          userName: input.user,
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ChannelSchema, channel);

      return;
    }

    yield* Console.log(
      `Connected ${channel.displayName ?? channel.handle} (${channel.handle}) to ${workspace.name}, as channel ${channel.id}. Its application password is kept encrypted and never shown again; revoke it on the user's profile page on the site to cut Peal off.`
    );
  })
).pipe(
  Command.withDescription(
    "Connect a WordPress site, to publish articles to it: its address, the user Peal publishes as, and an application password made for Peal on that user's profile page. The password is never an argument: the command asks for it at a terminal, without echo, or reads it from standard input (peal channels connect-website https://blog.example.com --user editor < password.txt). A site counts as one channel. Needs channel:connect."
  )
);
