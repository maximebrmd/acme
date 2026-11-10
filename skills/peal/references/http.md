# Peal over HTTP

The same steps as [SKILL.md](../SKILL.md), with curl. Read that file first:
its rules about publishing, idempotency and unconfirmed posts apply here
unchanged.

Every route is under `/api`. The API describes itself, without credentials,
at `/api/openapi.json`.

## Set up

```sh
export PEAL_API_URL=https://peal.example.com
export PEAL_API_KEY=peal_your_key
export PEAL_WORKSPACE=5b0c6e64-5d0f-4a7e-9a52-3f1c2d4e5f60
```

Send the key as a bearer token. Never print it, and never put it in a URL.
`PEAL_WORKSPACE` is the workspace's id.

## Check the server

No credentials. `health` answers 204 when the server is up, `ready` 204 when
its database answers too, and `changelog` lists what each release of the API
added.

```sh
curl -sS -o /dev/null -w "%{http_code}\n" "$PEAL_API_URL/api/health"
curl -sS -o /dev/null -w "%{http_code}\n" "$PEAL_API_URL/api/ready"
curl -sS "$PEAL_API_URL/api/changelog"
```

## Find ids

```sh
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/channels"
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/media?limit=20"
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/media/<media-id>"
```

A list that pages answers `{"items": [...], "nextCursor": ...}`: pass
`nextCursor` as `cursor` for the next page, until it is null.

Import a media from a public https address. It answers the media, with its
`id` and `status`:

```sh
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/cover.png", "altText": "The spring catalogue cover"}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/media/import"
```

Uploading a file takes several requests (a signed upload, then
`POST …/media/{mediaId}/complete`): use `peal media upload`, or import it
from an address.

## Draft

Create a draft. It answers 201 with the post, and its `id`:

```sh
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"channelIds": ["<channel-id>"], "content": {"text": "Our spring catalogue is out.", "media": [], "overrides": []}}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts"
```

`content.media` is a list of `{"mediaId": "...", "altText": "..."}`.
`content.overrides` is a list of `{"channelId": "...", "text": "..."}`: the
text a channel gets instead of the post's own.

Replace a draft. `PUT` takes the whole draft, and replaces its options too:
read it, change it, send it all back.

```sh
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>"
curl -sS -X PUT -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"channelIds": ["<channel-id>"], "content": {"text": "Our spring catalogue is out today.", "media": [], "overrides": []}}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>"
```

List drafts, and delete one:

```sh
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/drafts?limit=20"
curl -sS -X DELETE -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>"
```

A draft is not checked against the platforms.

## Schedule or publish

Public, and not taken back once out. Only when the user asked for these
channels and this time.

Create a post and send it in one request, under an `Idempotency-Key`. `when`
is `{"_tag": "at", "at": "<instant>", "timeZone": "<IANA zone>"}` or
`{"_tag": "now"}`.

```sh
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: <key>" \
  -d '{"channelIds": ["<channel-id>"], "content": {"text": "Our spring catalogue is out.", "media": [], "overrides": []}, "when": {"_tag": "at", "at": "2026-11-20T09:00:00Z", "timeZone": "Europe/Paris"}}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/send"
```

Within 24 hours, the same key with the same body answers the first post, and
makes no other. With another body it answers 409 `idempotency_key_reused`.
After a timeout or a 5xx, send the same request with the same key.

To check a post without making it, send the same body to
`POST …/posts/validate`: it answers 200 with `valid` and every problem, and
writes nothing. A post sent that breaks a platform's rule answers 422
`post_content_invalid` with every problem in `violations`, and nothing is
made.

Schedule a draft, move it, take it back to draft, or cancel it:

```sh
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"at": "2026-11-20T09:00:00Z", "timeZone": "Europe/Paris", "channelIds": ["<channel-id>"]}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/schedule"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"at": "2026-11-21T09:00:00Z", "timeZone": "Europe/Paris"}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/reschedule"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/unschedule"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/cancel"
```

## Read how it went

```sh
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>"
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/attempts"
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts?from=2026-11-01T00:00:00Z&to=2026-12-01T00:00:00Z"
```

Each entry of the post's `targets` has a `status`. For an `unconfirmed`
target, have the platform checked, then say what was found. Never repost it
blindly.

```sh
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"_tag": "published", "permalink": "https://social.example/@studio/1"}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/targets/<target-id>/confirm"
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"_tag": "notPublished"}' \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/targets/<target-id>/confirm"
```

Repost a target that failed, only when the user wants it sent again. Each
request sends the post again:

```sh
curl -sS -X POST -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/posts/<post-id>/targets/<target-id>/repost"
```

Counts and the activity log:

```sh
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/analytics/posts/<post-id>"
curl -sS -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/activity?limit=20"
```

## Errors and rate limits

An error answers a 4xx or 5xx status with a JSON body:

```json
{
  "_tag": "PostNotFound",
  "code": "post_not_found",
  "message": "The workspace has no post with this id.",
  "requestId": "0190f3a0-0000-7000-8000-0000000c0001"
}
```

Branch on `code`. Quote `requestId`, which the `X-Request-Id` header of
every answer gives too, when reporting a problem.

Every answer to a key carries `RateLimit-Policy` and `RateLimit`. A 429
`too_many_requests` carries `Retry-After` and `retryAfterSeconds`: wait that
long, then send the same request once. Print the headers with `-D -`:

```sh
curl -sS -D - -o /dev/null -H "Authorization: Bearer $PEAL_API_KEY" \
  "$PEAL_API_URL/api/workspaces/$PEAL_WORKSPACE/channels"
```
