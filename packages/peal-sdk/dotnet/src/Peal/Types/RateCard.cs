using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RateCard : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("apiRequestsPerMinute")]
    public required RateCardApiRequestsPerMinute ApiRequestsPerMinute { get; set; }

    [JsonPropertyName("assistant")]
    public required RateCardAssistant Assistant { get; set; }

    [JsonPropertyName("daysPerMonth")]
    public required int DaysPerMonth { get; set; }

    [JsonPropertyName("displayVatRate")]
    public required int DisplayVatRate { get; set; }

    [JsonPropertyName("meters")]
    public required RateCardMeters Meters { get; set; }

    [JsonPropertyName("prices")]
    public required RateCardPrices Prices { get; set; }

    [JsonPropertyName("storage")]
    public required RateCardStorage Storage { get; set; }

    [JsonPropertyName("unverifiedCeiling")]
    public required int UnverifiedCeiling { get; set; }

    [JsonPropertyName("x")]
    public required RateCardX X { get; set; }

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
