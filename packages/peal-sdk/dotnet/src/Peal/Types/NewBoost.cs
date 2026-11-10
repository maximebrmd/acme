using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewBoost : IJsonOnDeserialized
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
    /// An ISO 4217 currency code, in capitals: `EUR`, `USD`.
    /// </summary>
    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

    [JsonPropertyName("endsAt")]
    public required string EndsAt { get; set; }

    [JsonPropertyName("payer")]
    public string? Payer { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("specialAdCategory")]
    public required SpecialAdCategory SpecialAdCategory { get; set; }

    [JsonPropertyName("startsAt")]
    public string? StartsAt { get; set; }

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
