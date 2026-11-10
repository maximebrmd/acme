using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AdMoney : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    /// <summary>
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    /// </summary>
    [JsonPropertyName("amount")]
    public required long Amount { get; set; }

    /// <summary>
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    /// </summary>
    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

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
