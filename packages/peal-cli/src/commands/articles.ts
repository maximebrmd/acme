import { Console, DateTime, Effect, Option } from "effect";
import { Argument, Command, Flag } from "effect/cli";
import {
  ArticlePageSchema,
  ArticleSchema,
  ArticleStateNameSchema,
  maxArticlePageSize,
} from "peal-contract";
import type { Article } from "peal-contract";

import { confirmed, neverAsksInJson, yesFlagName } from "#confirm.ts";
import { explain } from "#explain.ts";
import { jsonFlag, printJson, printNothing } from "#json.ts";
import { columns, instant } from "#print.ts";
import { Refused } from "#refused.ts";
import { inWorkspace, workspaceFlag } from "#workspace.ts";

const articleArgument = Argument.String("article-id").pipe(
  Argument.withDescription(
    "The article, as peal articles list or the web app shows its id."
  )
);

// Where the article stands, in a few words.
const standingOf = (article: Article): string => {
  const { state } = article;

  switch (state._tag) {
    case "draft": {
      return "draft";
    }

    case "scheduled": {
      return `scheduled for ${instant(state.scheduledAt)}`;
    }

    case "publishing": {
      return "being sent";
    }

    case "published": {
      return state.removedAt === null
        ? `on the site${state.permalink === null ? "" : ` at ${state.permalink}`}`
        : `moved to the site's trash on ${instant(state.removedAt)}`;
    }

    case "failed": {
      return `failed (${state.reason}${state.code === null ? "" : `, ${state.code}`})`;
    }

    case "unconfirmed": {
      return "unconfirmed: check the site";
    }

    default: {
      return "unknown";
    }
  }
};

const linesOf = (articles: readonly Article[]) =>
  columns(
    articles.map((article) => [
      `  ${article.id}`,
      article.title,
      standingOf(article),
    ])
  );

const list = Command.make(
  "list",
  {
    json: jsonFlag,
    limit: Flag.Int("limit").pipe(
      Flag.withDescription(
        `How many articles, newest first: at most ${String(maxArticlePageSize)}.`
      ),
      Flag.optional
    ),
    status: Flag.Literals("status", ArticleStateNameSchema.literals).pipe(
      Flag.withDescription("Only the articles in this state."),
      Flag.optional
    ),
    workspace: workspaceFlag,
  },
  Effect.fn("articles.list")(function* listArticles(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const page = yield* client.articles
      .list({
        params: { workspaceId: workspace.id },
        query: {
          ...Option.match(input.limit, {
            onNone: () => ({}),
            onSome: (limit) => ({ limit }),
          }),
          ...Option.match(input.status, {
            onNone: () => ({}),
            onSome: (status) => ({ status }),
          }),
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ArticlePageSchema, page);

      return;
    }

    if (page.items.length === 0) {
      yield* Console.log(`${workspace.name} has no article.`);

      return;
    }

    for (const line of linesOf(page.items)) {
      yield* Console.log(line);
    }
  })
).pipe(
  Command.withDescription(
    "List the workspace's articles, newest first, with where each stands. Needs post:read."
  )
);

const show = Command.make(
  "show",
  { articleId: articleArgument, json: jsonFlag, workspace: workspaceFlag },
  Effect.fn("articles.show")(function* showArticle(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    const article = yield* client.articles
      .get({
        params: { articleId: input.articleId, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ArticleSchema, article);

      return;
    }

    yield* Console.log(article.title);
    yield* Console.log(`  Website channel: ${article.channelId}`);
    yield* Console.log(`  State:           ${standingOf(article)}`);
    yield* Console.log(`  On the site as:  ${article.siteStatus}`);
    yield* Console.log(
      `  Tags:            ${article.tags.length === 0 ? "none" : article.tags.join(", ")}`
    );
    yield* Console.log(
      `  Categories:      ${article.categories.length === 0 ? "none" : article.categories.join(", ")}`
    );
  })
).pipe(Command.withDescription("Show an article. Needs post:read."));

// Plain text as the editor's document: a paragraph for each block of
// lines between blank ones, a line break within one.
const documentOf = (text: string) => ({
  content: text
    .split(/\n\s*\n/u)
    .map((block) => block.trim())
    .filter((block) => block !== "")
    .map((block) => ({
      content: block
        .split("\n")
        .flatMap((line, index) =>
          index === 0
            ? [{ text: line, type: "text" }]
            : [{ type: "hardBreak" }, { text: line, type: "text" }]
        ),
      type: "paragraph",
    })),
  type: "doc" as const,
});

const zoneFlag = Flag.String("time-zone").pipe(
  Flag.withMetavar("<zone>"),
  Flag.withDescription("The IANA time zone it is scheduled in."),
  Flag.withDefault("UTC")
);

const atFlag = Flag.String("at").pipe(
  Flag.withMetavar("<instant>"),
  Flag.withDescription(
    "When Peal sends it, as an ISO 8601 instant such as 2026-11-20T09:00:00Z: now without it."
  ),
  Flag.optional
);

// The instant given, read as the API takes it.
const instantOf = (written: Option.Option<string>) =>
  Option.match(written, {
    onNone: () => Effect.succeed(Option.none<DateTime.Utc>()),
    onSome: (text) =>
      Option.match(DateTime.make(text), {
        onNone: () =>
          Effect.fail(
            new Refused({
              reason: `${text} is not an instant: write it as 2026-11-20T09:00:00Z. Nothing was done.`,
            })
          ),
        onSome: (at) => Effect.succeed(Option.some(DateTime.toUtc(at))),
      }),
  });

const create = Command.make(
  "create",
  {
    at: atFlag,
    channel: Flag.String("channel").pipe(
      Flag.withMetavar("<channel-id>"),
      Flag.withDescription(
        "The website's channel, as peal channels list shows its id."
      )
    ),
    json: jsonFlag,
    schedule: Flag.Boolean("schedule").pipe(
      Flag.withDescription(
        "Schedule it at once, at --at or now; a draft without it."
      ),
      Flag.withDefault(false)
    ),
    siteStatus: Flag.Literals("site-status", [
      "publish",
      "draft",
      "future",
    ]).pipe(
      Flag.withDescription(
        "What the site makes of it: published, a draft there, or scheduled there (future), which the site publishes at --at."
      ),
      Flag.withDefault("publish" as const)
    ),
    tag: Flag.String("tag").pipe(
      Flag.withDescription("A tag, as the site shows it; again for several."),
      Flag.atLeast(0)
    ),
    text: Flag.String("text").pipe(
      Flag.withDescription(
        "Its body as plain text: a paragraph for each block between blank lines. Rich text is the web app's editor's."
      )
    ),
    timeZone: zoneFlag,
    title: Flag.String("title").pipe(Flag.withDescription("Its title.")),
    workspace: workspaceFlag,
  },
  Effect.fn("articles.create")(function* createArticle(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const at = yield* instantOf(input.at);

    const fields = {
      body: documentOf(input.text),
      channelId: input.channel,
      siteStatus: input.siteStatus,
      tags: input.tag,
      title: input.title,
    };

    const time = Option.match(at, {
      onNone: () => ({ timeZone: input.timeZone }),
      onSome: (instantGiven) => ({
        at: instantGiven,
        timeZone: input.timeZone,
      }),
    });

    const article = yield* client.articles
      .create({
        params: { workspaceId: workspace.id },
        payload: input.schedule ? { ...fields, schedule: time } : fields,
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ArticleSchema, article);

      return;
    }

    yield* Console.log(
      `Article ${article.id}: ${standingOf(article)}.${input.schedule ? " What goes out is public." : " Schedule it with peal articles schedule."}`
    );
  })
).pipe(
  Command.withDescription(
    "Write an article for one of the workspace's websites, from plain text: a draft, or scheduled with --schedule. Needs post:create, and post:schedule to schedule."
  )
);

const schedule = Command.make(
  "schedule",
  {
    articleId: articleArgument,
    at: atFlag,
    json: jsonFlag,
    timeZone: zoneFlag,
    workspace: workspaceFlag,
  },
  Effect.fn("articles.schedule")(function* scheduleArticle(input) {
    const { client, url, workspace } = yield* inWorkspace(input.workspace);
    const at = yield* instantOf(input.at);

    const article = yield* client.articles
      .schedule({
        params: { articleId: input.articleId, workspaceId: workspace.id },
        payload: {
          ...Option.match(at, {
            onNone: () => ({}),
            onSome: (instantGiven) => ({ at: instantGiven }),
          }),
          timeZone: input.timeZone,
        },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ArticleSchema, article);

      return;
    }

    yield* Console.log(
      `Article ${article.id}: ${standingOf(article)}. What goes out is public.`
    );
  })
).pipe(
  Command.withDescription(
    "Schedule an article, or move it: Peal sends it at --at, or now. Needs post:schedule."
  )
);

// A change of an article's state, answered as it then stands.
const changing = (name: "retry" | "unschedule", description: string) =>
  Command.make(
    name,
    { articleId: articleArgument, json: jsonFlag, workspace: workspaceFlag },
    Effect.fn(`articles.${name}`)(function* change(input) {
      const { client, url, workspace } = yield* inWorkspace(input.workspace);
      const params = { articleId: input.articleId, workspaceId: workspace.id };

      const article = yield* (
        name === "retry"
          ? client.articles.retry({ params })
          : client.articles.unschedule({ params })
      ).pipe(Effect.mapError(explain(url)));

      if (input.json) {
        yield* printJson(ArticleSchema, article);

        return;
      }

      yield* Console.log(`Article ${article.id}: ${standingOf(article)}.`);
    })
  ).pipe(Command.withDescription(description));

const yesFlag = (what: string) =>
  Flag.Boolean(yesFlagName).pipe(
    Flag.withDescription(
      `The person who decides agreed to ${what}: do not ask again.`
    ),
    Flag.withDefault(false)
  );

const unpublish = Command.make(
  "unpublish",
  {
    articleId: articleArgument,
    json: jsonFlag,
    workspace: workspaceFlag,
    yes: yesFlag("move the article's post to the site's trash"),
  },
  Effect.fn("articles.unpublish")(function* unpublishArticle(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "it takes the article's post off the site for its readers",
      yes: input.yes,
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    if (!input.json) {
      yield* Console.log(
        `This moves the post of article ${input.articleId} to its site's trash: readers no longer see it.`
      );
    }

    yield* confirmed({ question: "Unpublish it?", yes: input.yes });

    const article = yield* client.articles
      .unpublish({
        params: { articleId: input.articleId, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printJson(ArticleSchema, article);

      return;
    }

    yield* Console.log(`Article ${article.id}: ${standingOf(article)}.`);
  })
).pipe(
  Command.withDescription(
    "Move an article's post to its site's trash. Asks first; --json needs --yes. Needs post:publish."
  )
);

const remove = Command.make(
  "delete",
  {
    articleId: articleArgument,
    json: jsonFlag,
    workspace: workspaceFlag,
    yes: yesFlag("delete the article from Peal"),
  },
  Effect.fn("articles.delete")(function* deleteArticle(input) {
    yield* neverAsksInJson({
      json: input.json,
      why: "it deletes the article from Peal for good",
      yes: input.yes,
    });

    const { client, url, workspace } = yield* inWorkspace(input.workspace);

    yield* confirmed({
      question: `Delete article ${input.articleId} from Peal? A post on its site stays there.`,
      yes: input.yes,
    });

    yield* client.articles
      .delete({
        params: { articleId: input.articleId, workspaceId: workspace.id },
      })
      .pipe(Effect.mapError(explain(url)));

    if (input.json) {
      yield* printNothing;

      return;
    }

    yield* Console.log(`Deleted article ${input.articleId} from Peal.`);
  })
).pipe(
  Command.withDescription(
    "Delete an article from Peal; a post on its site stays there. Asks first; --json needs --yes. Needs post:delete."
  )
);

export const articles = Command.make("articles").pipe(
  Command.withDescription(
    "The workspace's articles, for its websites: list, show, write, schedule, send again, unpublish."
  ),
  Command.withSubcommands([
    list,
    show,
    create,
    schedule,
    changing(
      "unschedule",
      "Take a scheduled article back to draft. Needs post:schedule."
    ),
    changing(
      "retry",
      "Send a failed article again now, or an unconfirmed one you checked is not on its site. Needs post:schedule."
    ),
    unpublish,
    remove,
  ])
);
