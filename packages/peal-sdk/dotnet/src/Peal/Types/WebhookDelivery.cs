using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record WebhookDelivery : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("attempts")]
    public required int Attempts { get; set; }

    [JsonPropertyName("completedAt")]
    public string? CompletedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("durationMs")]
    public int? DurationMs { get; set; }

    [JsonPropertyName("endpointId")]
    public required string EndpointId { get; set; }

    [JsonPropertyName("error")]
    public WebhookAttemptError? Error { get; set; }

    [JsonPropertyName("eventId")]
    public required string EventId { get; set; }

    [JsonPropertyName("eventType")]
    public required WebhookEventType EventType { get; set; }

    [JsonPropertyName("failureReason")]
    public WebhookDeliveryFailure? FailureReason { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("lastAttemptAt")]
    public string? LastAttemptAt { get; set; }

    [JsonPropertyName("nextAttemptAt")]
    public string? NextAttemptAt { get; set; }

    [JsonPropertyName("redeliveryOf")]
    public string? RedeliveryOf { get; set; }

    [JsonPropertyName("responseExcerpt")]
    public string? ResponseExcerpt { get; set; }

    [JsonPropertyName("responseStatus")]
    public int? ResponseStatus { get; set; }

    [JsonPropertyName("status")]
    public required WebhookDeliveryStatus Status { get; set; }

    [JsonPropertyName("workspaceExternalId")]
    public string? WorkspaceExternalId { get; set; }

    [JsonPropertyName("workspaceId")]
    public required string WorkspaceId { get; set; }

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
