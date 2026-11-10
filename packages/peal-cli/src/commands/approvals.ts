import { Console, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import { ApprovalPolicySchema } from "peal-contract";
import type { ApprovalPolicy, ApprovalRequest } from "peal-contract";

import { explain, explainingPublishing } from "#explain.ts";
import { instant } from "#print.ts";
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

// The approval a decision is about, as peal approvals list printed it: a
// decision is for what was read then.
const shownFlags = {
  approval: Flag.String("approval").pipe(
    Flag.withMetavar("<approval-id>"),
    Flag.withDescription(
      "The approval that waits, as peal approvals list shows its id."
    )
  ),
  subject: Flag.String("subject").pipe(
    Flag.withMetavar("<fingerprint>"),
    Flag.withDescription(
      "The fingerprint of what the post said when you read it, as peal approvals list shows it. If the post changed since, nothing is decided."
    )
  ),
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

    for (const asked of waiting) {
      yield* Console.log(
        `  ${asked.postId}  for ${instant(asked.schedule.at)} (${asked.schedule.timeZone})  ${askedBy(asked)}`
      );
      yield* Console.log(
        `    --approval ${asked.id} --subject ${asked.subjectHash}`
      );
    }

    yield* Console.log(
      "Read a post with peal review show, which prints the same --approval and --subject for what it shows: a decision is for what the post said then."
    );
  })
).pipe(
  Command.withDescription(
    "List the posts that wait for an approval: when each was asked to go out, who asked, and the --approval and --subject a decision on it takes. peal posts show and peal review show tell more."
  )
);

const approve = Command.make(
  "approve",
  { ...shownFlags, postId: postArgument, workspace: workspaceFlag },
  Effect.fn("approvals.approve")(function* approve({
    approval: approvalId,
    postId,
    subject: subjectHash,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    const { approval, late } = yield* client.review
      .approve({
        params: { postId, workspaceId: workspace.id },
        payload: { approvalId, subjectHash },
      })
      .pipe(explainingPublishing(url));

    yield* Console.log(
      late
        ? `Approved post ${postId}, after the time it was asked for (${instant(approval.schedule.at)}): nothing was published late. It is a draft again, still approved: schedule it for a new time.`
        : `Approved post ${postId}: it is scheduled for ${instant(approval.schedule.at)}.`
    );
  })
).pipe(
  Command.withDescription(
    "Approve a post that waits, as you read it: --approval and --subject come from peal approvals list, and a post that changed since is not approved. It is scheduled for the time it was asked for. Approved after that time, it goes back to draft instead, still approved. Approving is publishing: it needs a sign-in that may schedule and publish, and a role that approves posts."
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
    ...shownFlags,
    postId: postArgument,
    workspace: workspaceFlag,
  },
  Effect.fn("approvals.requestChanges")(function* requestChanges({
    approval: approvalId,
    comment,
    postId,
    subject: subjectHash,
    workspace: choice,
  }) {
    const { client, url, workspace } = yield* inWorkspace(choice);

    yield* client.review
      .requestChanges({
        params: { postId, workspaceId: workspace.id },
        payload: { approvalId, comment, subjectHash },
      })
      .pipe(explainingPublishing(url));

    yield* Console.log(
      `Asked for changes to post ${postId}: it is a draft again, with your comment, and its author is told.`
    );
  })
).pipe(
  Command.withDescription(
    "Send a post that waits back to draft, with a comment that says what to change, and the --approval and --subject peal approvals list shows for it. Needs the right to approve posts."
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
