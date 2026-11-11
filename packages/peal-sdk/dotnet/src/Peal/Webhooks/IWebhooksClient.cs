namespace Peal;

public partial interface IWebhooksClient
{
    /// <summary>
    /// Lists the workspace's webhook endpoints, oldest first. Needs webhook:read.
    /// </summary>
    WithRawResponseTask<IEnumerable<WebhookEndpoint>> ListAsync(
        ListWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has 10 endpoints at most, whatever its plan. With `scope` `partner`, in the home workspace of a partner account, the endpoint also hears what happens in every workspace the partner owns, each event naming its workspace and carrying the partner's own id for it (`workspaceExternalId`); any other workspace answers 404 `PartnerNotFound`. `channelIds` (50 at most) narrows it to the events about those channels: an event of one channel when it is listed, an event of a whole post when one of its channels is, and an event about no channel (a file, a boost) whatever it lists; leave such types out of `eventTypes` when they are not wanted. `workspaceIds` (200 at most), on a `partner` endpoint only, narrows it to those workspaces, the home workspace only if listed. Ids are checked for their shape only: one that names nothing matches nothing, and a filter stays as saved when what it names is gone. Filters apply when each event happens. `headers` (5 at most) go with every delivery beside Peal's own, which they never replace, for a gateway in front of the receiver that wants a token: a name is an HTTP token, once whatever its case, neither `host`, `content-type`, `content-length`, `user-agent`, `cookie`, a connection's own nor any `webhook-` name; a value is visible ASCII on one line, 1024 characters at most. Values are write-only: the endpoint shows their names (`headerNames`), never them. The signature does not cover them. Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookEndpointSecret> CreateAsync(
        NewWebhookEndpoint request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the workspace's deliveries across its endpoints, newest first, 30 a page unless `limit` (at most 100) says otherwise, filtered by `status`, `endpointId`, `eventType`, and when they were made: `since` (included) and `until` (excluded). The deliveries of a `partner` endpoint include those of the partner's other workspaces, each naming its workspace (`workspaceId`, `workspaceExternalId`). A delivery that failed for good (`failed`) stays 30 days, with the receiver's last answer: send it again with `POST …/webhooks/deliveries/redeliver`. Pass the page's `nextCursor` as `cursor` for the next one. Needs webhook:read.
    /// </summary>
    WithRawResponseTask<WebhookDeliveryPage> SearchDeliveriesAsync(
        SearchDeliveriesWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends many deliveries again, 100 a call at most: those named by `deliveryIds`, or the failed deliveries of the endpoint `endpointId` (made from `since`, before `until`, of `eventType`, each left out for any), oldest first, the last of each event only. Each goes to its own endpoint whatever the endpoint's filters are now, as a new delivery of the same event: the same `webhook-id` and body, signed anew. A delivery is skipped when its endpoint is off, when it is not the workspace's, and when its event was sent again since and that delivery is pending or went through, so calling again after a partial run sends nothing twice; `remaining` says how many more failed deliveries the selection holds. The new deliveries of an endpoint start a quarter of a second apart. A workspace sends 1000 deliveries again this way an hour, apart from the test events and single sends: a call that would pass it sends nothing (429 `TooManyWebhookSends`). Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookBulkRedelivery> RedeliverManyAsync(
        RedeliverManyWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Shows one of the workspace's webhook endpoints. Needs webhook:read.
    /// </summary>
    WithRawResponseTask<WebhookEndpoint> GetAsync(
        GetWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Deletes an endpoint, its secret and its delivery log: nothing more is sent to it. Needs webhook:manage.
    /// </summary>
    WithRawResponseTask DeleteAsync(
        DeleteWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Changes an endpoint's address, description, events, filters or headers, or turns it off or back on: what is left out stays as it is, and an empty filter hears everything again; `workspaceIds` is for an endpoint of the `partner` scope only (422 `WebhookFilterRefused`). `headers` replaces every header it had, `[]` removing them all: a header given without `value` keeps the value it has under that name, as none is ever shown, and one it does not have needs a value. Filters apply to the events that happen after the change. Turned off, it is sent nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on forgets the failures that turned it off. Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookEndpoint> UpdateAsync(
        WebhookEndpointChange request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Replaces an endpoint's signing secret, and answers with the new one, which is not shown again. For 24 hours each delivery carries two signatures, one per secret, so the receiver changes its own without missing any; the old one then signs nothing more. Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookEndpointSecret> RotateSecretAsync(
        RotateSecretWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends the endpoint a `webhook.test` event, or, with `eventType`, a sample of that type: its real shape, with ids that name nothing, the workspace's own id and `sample: true`, which the receiver must never act on. Either goes whatever the endpoint subscribes to or filters. It answers with the delivery, still pending: read the endpoint's deliveries to see how it ended. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookDelivery> SendTestAsync(
        SendTestWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the endpoint's deliveries, newest first, of a `status` and an `eventType` when given, 30 a page unless `limit` (at most 100) says otherwise: each one's status, the receiver's last answer, how many attempts were made and when the next one is. Pass the page's `nextCursor` as `cursor` for the next one. A delivery is kept 30 days. Needs webhook:read.
    /// </summary>
    WithRawResponseTask<WebhookDeliveryPage> ListDeliveriesAsync(
        ListDeliveriesWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Sends the delivery's event to the endpoint again, as a new delivery of the same event: the receiver gets the same `webhook-id` and body, with a new timestamp and signature. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookDelivery> RedeliverAsync(
        RedeliverWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
