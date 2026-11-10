using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PaidTotals : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("clicks")]
    public required long Clicks { get; set; }

    [JsonPropertyName("impressions")]
    public required long Impressions { get; set; }

    [JsonPropertyName("reach")]
    public required long Reach { get; set; }

    [JsonPropertyName("results")]
    public long? Results { get; set; }

    /// <summary>
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    /// </summary>
    [JsonPropertyName("spend")]
    public required long Spend { get; set; }

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
