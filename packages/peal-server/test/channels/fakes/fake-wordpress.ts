import { Buffer } from "node:buffer";
import { once } from "node:events";
import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { buffer } from "node:stream/consumers";

import { Effect, Option, Schema } from "effect";

// A WordPress site as its REST API documents it, on a loopback port: the
// discovery `Link` header on the home page, the index, the current user,
// and posts, media, tags and categories under `wp/v2`, with application
// passwords sent as Basic credentials. Only what Peal calls is answered.

/** A user of the site, who signs in with an application password. */
export interface FakeWordPressUser {
  readonly capabilities: Readonly<Record<string, boolean>>;
  readonly id: number;
  readonly login: string;
  readonly name: string;
  readonly password: string;
}

/** A post as the fake keeps it. */
export interface FakeWordPressPost {
  author: number;
  categories: number[];
  content: string;
  date_gmt: string | null;
  excerpt: string;
  featured_media: number;
  id: number;
  modified_gmt: string;
  status: string;
  tags: number[];
  title: string;
}

/** A file the fake was sent. */
export interface FakeWordPressMedia {
  readonly altText: string;
  readonly bytes: Buffer;
  readonly contentType: string;
  readonly fileName: string;
  readonly id: number;
}

/** A request the fake received, by the route it named. */
export interface FakeWordPressRequest {
  readonly authorization: string | undefined;
  readonly body: Buffer;
  readonly headers: IncomingMessage["headers"];
  readonly method: string;
  readonly query: URLSearchParams;
  /** The REST route, such as `/wp/v2/posts`; the page's path otherwise. */
  readonly route: string;
}

/** How the site behaves, for the case a test makes. */
export interface FakeWordPressOptions {
  /** Where the home page is, below the origin: `/` unless told. */
  readonly home?: string;
  /** Whether the home page names the API root in a `Link` header. */
  readonly linkHeader?: boolean;
  /** Whether permalinks are on: `/wp-json/…`, else `?rest_route=…`. */
  readonly pretty?: boolean;
  /**
   * Answers the request instead of the site, when it gives an answer: a
   * failure or a silence the test needs.
   */
  readonly intercept?: (
    request: FakeWordPressRequest
  ) => FakeWordPressAnswer | "hang" | undefined;
  readonly users?: readonly FakeWordPressUser[];
  /**
   * Whether the site does what the request asks and then drops the
   * connection before it answers: an answer lost on the way.
   */
  readonly drop?: (request: FakeWordPressRequest) => boolean;
  /**
   * Whether the site's search reads names as they display, `&amp;` as
   * `&`, as a search plugin may: it then finds a name WordPress stored
   * encoded, and answers it encoded.
   */
  readonly searchesDisplayedNames?: boolean;
  /** Whether the site ignores `modified_after`, as WordPress before 5.7. */
  readonly beforeModifiedAfter?: boolean;
}

export interface FakeWordPressAnswer {
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly status: number;
}

export interface FakeWordPress {
  /** The site's home page, as a member types it. */
  readonly home: string;
  /** The root of its REST API, as discovery names it. */
  readonly root: string;
  readonly categories: () => ReadonlyMap<number, string>;
  /** Adds a category, as an editor would in wp-admin: its id. */
  readonly addCategory: (name: string) => number;
  /** Adds a post made outside Peal, as it would be listed: its id. */
  readonly addPost: (post: Partial<FakeWordPressPost>) => number;
  readonly media: () => readonly FakeWordPressMedia[];
  /** Deletes a file from the site's library, as its administrator would. */
  readonly deleteMedia: (id: number) => void;
  readonly posts: () => readonly FakeWordPressPost[];
  readonly requests: () => readonly FakeWordPressRequest[];
  readonly tags: () => ReadonlyMap<number, string>;
}

/** An editor of the site, who may publish and upload. */
export const editor: FakeWordPressUser = {
  capabilities: {
    edit_posts: true,
    manage_categories: true,
    publish_posts: true,
    upload_files: true,
  },
  id: 7,
  login: "editor",
  name: "Synthetic Editor",
  password: "synthetic editor password 1234",
};

/** A contributor, who writes but may neither publish nor upload. */
export const contributor: FakeWordPressUser = {
  capabilities: { edit_posts: true },
  id: 8,
  login: "contributor",
  name: "Synthetic Contributor",
  password: "synthetic contributor password 9876",
};

const decodeAddress = Schema.decodeUnknownSync(
  Schema.Struct({ port: Schema.Number })
);

const error = (status: number, code: string, message: string) => ({
  body: { code, data: { status }, message },
  status,
});

// The user the Basic credentials name, if the password is theirs: spaces
// are stripped, as WordPress does.
const signedIn = (
  users: readonly FakeWordPressUser[],
  authorization: string | undefined
): FakeWordPressUser | undefined => {
  if (authorization?.startsWith("Basic ") !== true) {
    return undefined;
  }

  const decoded = Buffer.from(authorization.slice(6), "base64").toString();
  const colon = decoded.indexOf(":");
  const login = decoded.slice(0, colon);
  const password = decoded.slice(colon + 1).replaceAll(" ", "");

  return users.find(
    (user) =>
      user.login === login && user.password.replaceAll(" ", "") === password
  );
};

// What a post's request may set, as the posts reference lists it.
const PostFieldsSchema = Schema.Struct({
  categories: Schema.optionalKey(Schema.Array(Schema.Number)),
  content: Schema.optionalKey(Schema.String),
  date_gmt: Schema.optionalKey(Schema.NullOr(Schema.String)),
  excerpt: Schema.optionalKey(Schema.String),
  featured_media: Schema.optionalKey(Schema.Number),
  status: Schema.optionalKey(Schema.String),
  tags: Schema.optionalKey(Schema.Array(Schema.Number)),
  title: Schema.optionalKey(Schema.String),
});

const TermFieldsSchema = Schema.Struct({
  name: Schema.optionalKey(Schema.String),
});

// A JSON body as the schema reads it; nothing of it when it does not.
const bodyOf =
  <A>(schema: Schema.Codec<A, unknown>, empty: A) =>
  (body: Buffer): A =>
    Option.getOrElse(
      Schema.decodeUnknownOption(Schema.fromJsonString(schema))(
        body.toString()
      ),
      () => empty
    );

const postFieldsOf = bodyOf(PostFieldsSchema, {});

// A term's name as WordPress stores and answers it: `&`, `<` and `>`
// encoded (`_wp_specialchars` on `pre_term_name`), an entity already
// written left as it is.
const storedTermName = (name: string) =>
  name
    .replaceAll(/&(?!(?:amp|lt|gt|quot|#\d+);)/gu, "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const termFieldsOf = bodyOf(TermFieldsSchema, {});

const send = (response: ServerResponse, answer: FakeWordPressAnswer) => {
  if (answer.body === undefined) {
    response.writeHead(answer.status, {
      connection: "close",
      ...answer.headers,
    });
    response.end();

    return;
  }

  response.writeHead(answer.status, {
    connection: "close",
    "content-type": "application/json; charset=UTF-8",
    ...answer.headers,
  });
  response.end(JSON.stringify(answer.body));
};

/**
 * A fake WordPress site for the life of the scope. Its address is plain
 * HTTP on loopback: tests open the outbound guard to reach it.
 */
export const fakeWordPress = (options: FakeWordPressOptions = {}) =>
  Effect.acquireRelease(
    Effect.promise(async () => {
      const users = options.users ?? [editor, contributor];
      const homePath = options.home ?? "/";
      const pretty = options.pretty ?? true;
      const received: FakeWordPressRequest[] = [];
      const posts = new Map<number, FakeWordPressPost>();
      const files: FakeWordPressMedia[] = [];
      const tags = new Map<number, string>();
      const categories = new Map<number, string>([[1, "Uncategorized"]]);
      let nextId = 100;
      let origin = "";

      // A featured image the site's library has, or none.
      const knownMedia = (id: number | undefined) =>
        id === undefined || id === 0 || files.some((file) => file.id === id);

      const rootUrl = () =>
        pretty ? `${origin}/wp-json/` : `${origin}/?rest_route=/`;

      const postView = (post: FakeWordPressPost) => ({
        ...post,
        content: { raw: post.content, rendered: post.content },
        excerpt: { raw: post.excerpt, rendered: post.excerpt },
        link: `${origin}/?p=${post.id}`,
        title: { raw: post.title, rendered: post.title },
      });

      const termsOf = (
        terms: Map<number, string>,
        request: FakeWordPressRequest,
        user: FakeWordPressUser | undefined
      ): FakeWordPressAnswer => {
        if (request.method === "GET") {
          // A `LIKE` on the name as stored, whatever was searched for.
          const search = (request.query.get("search") ?? "").toLowerCase();

          const searched = (name: string) =>
            options.searchesDisplayedNames === true
              ? name.replaceAll("&amp;", "&")
              : name;

          return {
            body: [...terms].flatMap(([id, name]) =>
              searched(name).toLowerCase().includes(search)
                ? [{ id, name, slug: name.toLowerCase() }]
                : []
            ),
            status: 200,
          };
        }

        if (user === undefined) {
          return error(
            401,
            "rest_cannot_create",
            "Sorry, you are not allowed to create terms."
          );
        }

        const { name } = termFieldsOf(request.body);

        if (name === undefined || name === "") {
          return error(
            400,
            "rest_missing_callback_param",
            "Missing parameter(s): name"
          );
        }

        const stored = storedTermName(name);

        const existing = [...terms].find(
          ([, known]) => known.toLowerCase() === stored.toLowerCase()
        );

        if (existing !== undefined) {
          return {
            body: {
              code: "term_exists",
              data: { status: 400, term_id: existing[0] },
              message: "A term with the name provided already exists.",
            },
            status: 400,
          };
        }

        nextId += 1;
        terms.set(nextId, stored);

        return { body: { id: nextId, name: stored }, status: 201 };
      };

      const createPost = (
        request: FakeWordPressRequest,
        user: FakeWordPressUser
      ): FakeWordPressAnswer => {
        if (user.capabilities["edit_posts"] !== true) {
          return error(
            403,
            "rest_cannot_create",
            "Sorry, you are not allowed to create posts as this user."
          );
        }

        const fields = postFieldsOf(request.body);

        nextId += 1;

        const post: FakeWordPressPost = {
          author: user.id,
          categories: [...(fields.categories ?? [])],
          content: fields.content ?? "",
          date_gmt: fields.date_gmt ?? null,
          excerpt: fields.excerpt ?? "",
          // A file the library does not have is dropped, as WordPress
          // drops it: the post is saved without it, and no error said.
          featured_media: knownMedia(fields.featured_media)
            ? (fields.featured_media ?? 0)
            : 0,
          id: nextId,
          modified_gmt: new Date().toISOString().slice(0, 19),
          status: fields.status ?? "draft",
          tags: [...(fields.tags ?? [])],
          title: fields.title ?? "",
        };

        posts.set(post.id, post);

        return { body: postView(post), status: 201 };
      };

      const postsRoute = (
        request: FakeWordPressRequest,
        user: FakeWordPressUser | undefined,
        id: number | undefined
      ): FakeWordPressAnswer => {
        if (user === undefined) {
          return error(
            401,
            "rest_cannot_create",
            "Sorry, you are not allowed to do that."
          );
        }

        if (id === undefined && request.method === "GET") {
          const search = request.query.get("search") ?? "";
          const after = request.query.get("modified_after");

          return {
            body: [...posts.values()].flatMap((post) =>
              post.title.includes(search) &&
              (after === null ||
                options.beforeModifiedAfter === true ||
                post.modified_gmt > after.slice(0, 19))
                ? [postView(post)]
                : []
            ),
            status: 200,
          };
        }

        if (id === undefined) {
          return createPost(request, user);
        }

        const post = posts.get(id);

        if (post === undefined) {
          return error(404, "rest_post_invalid_id", "Invalid post ID.");
        }

        if (request.method === "DELETE") {
          if (request.query.get("force") === "true") {
            posts.delete(id);

            return {
              body: { deleted: true, previous: postView(post) },
              status: 200,
            };
          }

          if (post.status === "trash") {
            return error(
              410,
              "rest_already_trashed",
              "The post has already been deleted."
            );
          }

          post.status = "trash";

          return { body: postView(post), status: 200 };
        }

        if (request.method === "POST") {
          const fields = postFieldsOf(request.body);

          Object.assign(post, {
            ...fields,
            featured_media: knownMedia(fields.featured_media)
              ? (fields.featured_media ?? post.featured_media)
              : 0,
            categories: [...(fields.categories ?? post.categories)],
            tags: [...(fields.tags ?? post.tags)],
          });
          post.modified_gmt = new Date().toISOString().slice(0, 19);
        }

        return { body: postView(post), status: 200 };
      };

      const mediaRoute = (
        request: FakeWordPressRequest,
        user: FakeWordPressUser | undefined
      ): FakeWordPressAnswer => {
        if (user?.capabilities["upload_files"] !== true) {
          return error(
            403,
            "rest_cannot_create",
            "Sorry, you are not allowed to upload media on this site."
          );
        }

        const disposition = request.headers["content-disposition"] ?? "";

        const fileName = /filename="?(?<name>[^";]+)"?/u.exec(disposition)
          ?.groups?.["name"];

        if (fileName === undefined) {
          return error(
            400,
            "rest_upload_no_content_disposition",
            "No Content-Disposition supplied."
          );
        }

        nextId += 1;

        const file: FakeWordPressMedia = {
          altText: "",
          bytes: request.body,
          contentType: request.headers["content-type"] ?? "",
          fileName,
          id: nextId,
        };

        files.push(file);

        return {
          body: {
            id: file.id,
            source_url: `${origin}/wp-content/uploads/${fileName}`,
          },
          status: 201,
        };
      };

      const route = (request: FakeWordPressRequest): FakeWordPressAnswer => {
        const user = signedIn(users, request.authorization);
        const { route: path } = request;

        if (request.authorization !== undefined && user === undefined) {
          return error(
            401,
            "incorrect_password",
            "The provided password is an invalid application password."
          );
        }

        if (path === "/") {
          return {
            body: {
              authentication: {
                "application-passwords": {
                  endpoints: {
                    authorization: `${origin}/wp-admin/authorize-application.php`,
                  },
                },
              },
              home: `${origin}${homePath.replace(/\/$/u, "")}`,
              name: "Synthetic Garden Journal",
              namespaces: ["oembed/1.0", "wp/v2", "wp-site-health/v1"],
              url: origin,
            },
            status: 200,
          };
        }

        if (path === "/wp/v2/users/me") {
          return user === undefined
            ? error(
                401,
                "rest_not_logged_in",
                "You are not currently logged in."
              )
            : {
                body: {
                  capabilities: user.capabilities,
                  id: user.id,
                  name: user.name,
                  slug: user.login,
                },
                status: 200,
              };
        }

        if (path === "/wp/v2/tags") {
          return termsOf(tags, request, user);
        }

        if (path === "/wp/v2/categories") {
          return termsOf(categories, request, user);
        }

        if (path === "/wp/v2/media") {
          return mediaRoute(request, user);
        }

        const post = /^\/wp\/v2\/posts(?:\/(?<id>\d+))?$/u.exec(path);

        if (post !== null) {
          return postsRoute(
            request,
            user,
            post.groups?.["id"] === undefined
              ? undefined
              : Number(post.groups["id"])
          );
        }

        return error(
          404,
          "rest_no_route",
          "No route was found matching the URL and request method."
        );
      };

      const answer = async (
        incoming: IncomingMessage,
        response: ServerResponse
      ) => {
        const body = await buffer(incoming);
        const url = new URL(incoming.url ?? "/", origin);
        const restRoute = url.searchParams.get("rest_route");

        const routeOf = () => {
          if (restRoute !== null) {
            return restRoute;
          }

          if (pretty && url.pathname.startsWith("/wp-json")) {
            return url.pathname.slice("/wp-json".length) || "/";
          }

          return url.pathname;
        };

        const request: FakeWordPressRequest = {
          authorization: incoming.headers.authorization,
          body,
          headers: incoming.headers,
          method: incoming.method ?? "GET",
          query: url.searchParams,
          route: routeOf(),
        };

        received.push(request);

        const intercepted = options.intercept?.(request);

        if (intercepted === "hang") {
          return;
        }

        if (intercepted !== undefined) {
          send(response, intercepted);

          return;
        }

        const isApi =
          restRoute !== null || (pretty && url.pathname.startsWith("/wp-json"));

        if (!isApi) {
          send(response, {
            headers:
              options.linkHeader === false
                ? {}
                : { link: `<${rootUrl()}>; rel="https://api.w.org/"` },
            status: url.pathname === homePath ? 200 : 404,
          });

          return;
        }

        const answered = route(request);

        if (options.drop?.(request) === true) {
          incoming.socket.destroy();

          return;
        }

        send(response, answered);
      };

      const server = createServer((incoming, response) => {
        void answer(incoming, response);
      });

      server.listen(0, "127.0.0.1");
      await once(server, "listening");

      origin = `http://127.0.0.1:${decodeAddress(server.address()).port}`;

      const fake: FakeWordPress = {
        addCategory: (name) => {
          nextId += 1;
          categories.set(nextId, storedTermName(name));

          return nextId;
        },
        addPost: (partial) => {
          nextId += 1;

          const post: FakeWordPressPost = {
            author: editor.id,
            categories: [],
            content: "",
            date_gmt: null,
            excerpt: "",
            featured_media: 0,
            id: nextId,
            modified_gmt: new Date().toISOString().slice(0, 19),
            status: "publish",
            tags: [],
            title: "",
            ...partial,
          };

          posts.set(post.id, post);

          return post.id;
        },
        categories: () => new Map(categories),
        home: `${origin}${homePath}`,
        deleteMedia: (id) => {
          const index = files.findIndex((file) => file.id === id);

          if (index !== -1) {
            files.splice(index, 1);
          }
        },
        media: () => [...files],
        posts: () => [...posts.values()],
        requests: () => [...received],
        root: rootUrl(),
        tags: () => new Map(tags),
      };

      return { fake, server };
    }),
    ({ server }) =>
      Effect.promise(async () => {
        server.closeAllConnections();
        server.close();
        await once(server, "close");
      })
  ).pipe(Effect.map(({ fake }) => fake));
