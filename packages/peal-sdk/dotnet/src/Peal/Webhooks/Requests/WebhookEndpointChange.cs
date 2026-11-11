using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record WebhookEndpointChange
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string EndpointId { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string>? ChannelIds { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    [JsonPropertyName("eventTypes")]
    public IEnumerable<SubscribableWebhookEventType>? EventTypes { get; set; }

    [JsonPropertyName("headers")]
    public IEnumerable<WebhookHeaderChange>? Headers { get; set; }

    [JsonPropertyName("url")]
    public string? Url { get; set; }

    [JsonPropertyName("workspaceIds")]
    public IEnumerable<string>? WorkspaceIds { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
