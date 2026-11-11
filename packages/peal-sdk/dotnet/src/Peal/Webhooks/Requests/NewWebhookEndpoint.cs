using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewWebhookEndpoint
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string>? ChannelIds { get; set; }

    [JsonPropertyName("description")]
    public string? Description { get; set; }

    [JsonPropertyName("enabled")]
    public bool? Enabled { get; set; }

    [JsonPropertyName("eventTypes")]
    public IEnumerable<SubscribableWebhookEventType> EventTypes { get; set; } =
        new List<SubscribableWebhookEventType>();

    [JsonPropertyName("scope")]
    public WebhookEndpointScope? Scope { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    [JsonPropertyName("workspaceIds")]
    public IEnumerable<string>? WorkspaceIds { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
