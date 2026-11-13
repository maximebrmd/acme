using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RateCardMeters : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("assistantImages")]
    public required MeterTerms AssistantImages { get; set; }

    [JsonPropertyName("assistantRequests")]
    public required MeterTerms AssistantRequests { get; set; }

    [JsonPropertyName("managedAds")]
    public required MeterTerms ManagedAds { get; set; }

    [JsonPropertyName("outboundMessages")]
    public required MeterTerms OutboundMessages { get; set; }

    [JsonPropertyName("xApi")]
    public required MeterTerms XApi { get; set; }

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
