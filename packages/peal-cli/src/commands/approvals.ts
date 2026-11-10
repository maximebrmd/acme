import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { ApprovalPolicySchema } from "peal-contract";
import type { ApprovalPolicy, ApprovalRequest } from "peal-contract";

import { explain } from "#explain.ts";
import { columns, instant } from "#print.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const postArgument = Argument.String("post-id").pipe(
  Argument.withDescription(
    "The post, as the web app or peal approvals list shows its id."
  )
);

// Which posts wait, in words. Every policy has its sentence, so a new one
// fails to compile until it has one.
const policies: Readonly<Record<ApprovalPolicy, string>> = {
  always: "every post waits for an approval before it is scheduled",
  contributorsAndApplications:
    "posts by contributors and applications wait for an approval before they are scheduled; a member who may schedule, in the web app, schedules at once",
  never: "no post waits for an approval: whoever may schedule does",
};

const askedBy = ({ requestedByName, requestedVia }: ApprovalRequest) => {
  if (requestedVia === "apiKey") {
    return "asked with an API key";
  }

  const who = requestedByName ?? "a member";

  return requestedVia === "application"
    ? `asked by ${who}, through an application`
    : `asked by ${who}`;
};

const list = Command.make(
  "list",
  { workspace: workspaceFlag },
  Effect.fn("approvals.list")(function* list({ workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const waiting = yield* client.review
      .pending({ params: { workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    if (waiting.length === 0) {
      yield* Console.log(`No post of ${workspace.name} waits for an approval.`);

      return;
    }

    yield* Console.log(
      `Posts of ${workspace.name} waiting for an approval, oldest first:`
    );

    for (const line of columns(
      waiting.map((asked) => [
        `  ${asked.postId}`,
        `for ${instant(asked.schedule.at)} (${asked.schedule.timeZone})`,
        askedBy(asked),
      ])
    )) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the posts that wait for an approval: when each was asked to go out, and who asked. peal posts show and peal review show tell more."
  )
);

const approve = Command.make(
  "approve",
  { postId: postArgument, workspace: workspaceFlag },
  Effect.fn("approvals.approve")(function* approve({
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const { approval, late } = yield* client.review
      .approve({ params: { postId, workspaceId: workspace.id } })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      late
        ? `Approved post ${postId}, after the time it was asked for (${instant(approval.schedule.at)}): nothing was published late. It is a draft again, still approved: schedule it for a new time.`
        : `Approved post ${postId}: it is scheduled for ${instant(approval.schedule.at)}.`
    );
  })
).pipe(
  Command.withDescription(
    "Approve a post that waits: it is scheduled for the time it was asked for. Approved after that time, it goes back to draft instead, still approved. Needs the right to approve posts."
  )
);

const requestChanges = Command.make(
  "request-changes",
  {
    comment: Flag.String("comment").pipe(
      Flag.withMetavar("<text>"),
      Flag.withDescription(
        "What to change, kept as a comment on the post, in plain text."
      )
    ),
    postId: postArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("approvals.requestChanges")(function* requestChanges({
    comment,
    postId,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.review
      .requestChanges({
        params: { postId, workspaceId: workspace.id },
        payload: { comment },
      })
      .pipe(Effect.mapError(explain(url)));

    yield* Console.log(
      `Asked for changes to post ${postId}: it is a draft again, with your comment, and its author is told.`
    );
  })
).pipe(
  Command.withDescription(
    "Send a post that waits back to draft, with a comment that says what to change. Needs the right to approve posts."
  )
);

const policy = Command.make(
  "policy",
  {
    set: Flag.Literals("set", ApprovalPolicySchema.literals).pipe(
      Flag.withDescription(
        "Choose which posts wait: never, contributorsAndApplications or always."
      ),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("approvals.policy")(function* policy({ set, workspace: choice }) {
    const { client, url, workspace } = yield* inWorkspace(choice);
    const params = { workspaceId: workspace.id };

    const { approvalPolicy } = yield* Option.match(set, {
      onNone: () => client.review.settings({ params }),
      onSome: (chosen) =>
        client.review.updateSettings({
          params,
          payload: { approvalPolicy: chosen },
        }),
    }).pipe(Effect.mapError(explain(url)));

    yield* Console.log(`In ${workspace.name}, ${policies[approvalPolicy]}.`);
  })
).pipe(
  Command.withDescription(
    "Show which of the workspace's posts wait for an approval before they are scheduled, or choose it with --set, which owners and admins may."
  )
);

export const approvals = Command.make("approvals").pipe(
  Command.withDescription(
    "Approvals: the posts that wait for one, approving them or asking for changes, and the workspace's policy."
  ),
  Command.withSubcommands([list, approve, requestChanges, policy])
);
