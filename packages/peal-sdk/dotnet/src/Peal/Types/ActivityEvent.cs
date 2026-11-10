using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ActivityEvent : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("actor")]
    public required ActivityActor Actor { get; set; }

    [JsonPropertyName("application")]
    public ActivityApplication? Application { get; set; }

    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("impersonated")]
    public required bool Impersonated { get; set; }

    [JsonPropertyName("objectIds")]
    public Dictionary<string, string> ObjectIds { get; set; } = new Dictionary<string, string>();

    [JsonPropertyName("occurredAt")]
    public required string OccurredAt { get; set; }

    [JsonPropertyName("operation")]
    public required string Operation { get; set; }

    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    [JsonPropertyName("status")]
    public int? Status { get; set; }

    [JsonPropertyName("via")]
    public required ActivityVia Via { get; set; }

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
