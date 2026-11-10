import { Effect, Layer, Option } from "effect";

import { ActivityLog } from "#activity/application/activity-log.ts";
import { ConnectLinkJournal } from "#channels/application/connect-link-journal.ts";
import { linkKeyOf } from "#channels/domain/connect-link.ts";

/**
 * ConnectLinkJournal in the workspaces' activity logs: the link as the key
 * it stands as (`connect-link:<id>`), through `connectLink`, under the
 * hosted endpoint that connected (`hostedConnect.complete` or
 * `hostedConnect.choose`), with the link's id and, when it connected one
 * channel, that channel's.
 */
export const LoggedConnectLinkJournal = Layer.effect(
  ConnectLinkJournal,
  Effect.gen(function* LoggedConnectLinkJournal() {
    const log = yield* ActivityLog;

    return ConnectLinkJournal.of({
      connected: (link, channelIds, step) => {
        const [channelId, ...others] = channelIds;

        return log
          .record({
            actor: { _tag: "apiKey", apiKeyId: linkKeyOf(link) },
            clientId: Option.none(),
            errorCode: Option.none(),
            impersonated: false,
            named: {
              channelId: others.length === 0 ? channelId : undefined,
              linkId: link.id,
            },
            operation: `hostedConnect.${step}`,
            requestId: Option.none(),
            status: Option.some(200),
            via: "connectLink",
            workspaceId: link.workspaceId,
          })
          .pipe(Effect.asVoid);
      },
    });
  })
);
