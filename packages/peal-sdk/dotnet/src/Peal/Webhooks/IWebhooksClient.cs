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
    /// Adds a webhook endpoint to the workspace, and answers with its signing secret, which is not shown again. Its address must be HTTPS on the default port, on a public host, without credentials; Peal follows no redirect from it. A workspace has 10 endpoints at most, whatever its plan. Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookEndpointSecret> CreateAsync(
        NewWebhookEndpoint request,
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
    /// Changes an endpoint's address, description or events, or turns it off or back on: what is left out stays as it is. Turned off, it is sent nothing, its pending deliveries fail, and events that happen meanwhile are not kept for it. Turning it back on forgets the failures that turned it off. Needs webhook:manage.
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
    /// Sends the endpoint a `webhook.test` event, whatever it subscribes to, and answers with its delivery, still pending: read the endpoint's deliveries to see how it ended. A workspace sends 30 test events and deliveries again an hour at most (429 `TooManyWebhookSends`). Needs webhook:manage.
    /// </summary>
    WithRawResponseTask<WebhookDelivery> SendTestAsync(
        SendTestWebhooksRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Lists the endpoint's deliveries, newest first, 30 a page unless `limit` (at most 100) says otherwise: each one's status, the receiver's last answer, how many attempts were made and when the next one is. Pass the page's `nextCursor` as `cursor` for the next one. A delivery is kept 30 days. Needs webhook:read.
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
