using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record WebhookEndpoint : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelIds")]
    public IEnumerable<string> ChannelIds { get; set; } = new List<string>();

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("description")]
    public required string Description { get; set; }

    [JsonPropertyName("disabledAt")]
    public string? DisabledAt { get; set; }

    [JsonPropertyName("disabledReason")]
    public WebhookDisabledReason? DisabledReason { get; set; }

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    [JsonPropertyName("eventTypes")]
    public IEnumerable<SubscribableWebhookEventType> EventTypes { get; set; } =
        new List<SubscribableWebhookEventType>();

    [JsonPropertyName("failingSince")]
    public string? FailingSince { get; set; }

    [JsonPropertyName("headerNames")]
    public IEnumerable<string> HeaderNames { get; set; } = new List<string>();

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("previousSecretExpiresAt")]
    public string? PreviousSecretExpiresAt { get; set; }

    [JsonPropertyName("scope")]
    public required WebhookEndpointScope Scope { get; set; }

    [JsonPropertyName("updatedAt")]
    public required string UpdatedAt { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    [JsonPropertyName("workspaceIds")]
    public IEnumerable<string> WorkspaceIds { get; set; } = new List<string>();

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
