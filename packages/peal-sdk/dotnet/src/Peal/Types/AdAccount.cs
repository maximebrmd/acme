using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AdAccount : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("access")]
    public required AdAccess Access { get; set; }

    /// <summary>
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    /// </summary>
    [JsonPropertyName("amountSpent")]
    public long? AmountSpent { get; set; }

    [JsonPropertyName("connectedAt")]
    public required string ConnectedAt { get; set; }

    [JsonPropertyName("connectionId")]
    public required string ConnectionId { get; set; }

    /// <summary>
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    /// </summary>
    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

    [JsonPropertyName("externalId")]
    public required string ExternalId { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("minorUnitDigits")]
    public required double MinorUnitDigits { get; set; }

    /// <summary>
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    /// </summary>
    [JsonPropertyName("monthlyCeiling")]
    public long? MonthlyCeiling { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("network")]
    public required AdNetwork Network { get; set; }

    [JsonPropertyName("newAdsUntrackedUntil")]
    public string? NewAdsUntrackedUntil { get; set; }

    /// <summary>
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    /// </summary>
    [JsonPropertyName("spendCap")]
    public long? SpendCap { get; set; }

    [JsonPropertyName("spendingEnabled")]
    public required bool SpendingEnabled { get; set; }

    [JsonPropertyName("status")]
    public required AdAccountStatus Status { get; set; }

    [JsonPropertyName("syncedAt")]
    public string? SyncedAt { get; set; }

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

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
