using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record Boost : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("accountId")]
    public required string AccountId { get; set; }

    [JsonPropertyName("audience")]
    public required BoostAudience Audience { get; set; }

    [JsonPropertyName("beneficiary")]
    public string? Beneficiary { get; set; }

    [JsonPropertyName("budget")]
    public required BoostBudget Budget { get; set; }

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    /// <summary>
    /// An amount in the currency's minor units, as the ad network counts them: cents for EUR and USD, yen for JPY. Divide by 10 to the power of the account's `minorUnitDigits` to show it.
    /// </summary>
    [JsonPropertyName("committed")]
    public required long Committed { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    /// <summary>
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    /// </summary>
    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

    [JsonPropertyName("endsAt")]
    public required string EndsAt { get; set; }

    [JsonPropertyName("failureReason")]
    public BoostFailureReason? FailureReason { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("networkCode")]
    public string? NetworkCode { get; set; }

    [JsonPropertyName("objective")]
    public required BoostObjective Objective { get; set; }

    [JsonPropertyName("payer")]
    public string? Payer { get; set; }

    [JsonPropertyName("platform")]
    public required BoostPlatform Platform { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("startsAt")]
    public required string StartsAt { get; set; }

    [JsonPropertyName("state")]
    public required BoostState State { get; set; }

    [JsonPropertyName("stateAt")]
    public required string StateAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public required string UpdatedAt { get; set; }

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
