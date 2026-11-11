using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record SearchDeliveriesWebhooksRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? Cursor { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    [JsonIgnore]
    public WebhookEventType? EventType { get; set; }

    [JsonIgnore]
    public WebhookDeliveryStatus? Status { get; set; }

    [JsonIgnore]
    public string? EndpointId { get; set; }

    [JsonIgnore]
    public string? Since { get; set; }

    [JsonIgnore]
    public string? Until { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
