using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AdAuditEntry : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("accountId")]
    public string? AccountId { get; set; }

    [JsonPropertyName("action")]
    public required AdAuditAction Action { get; set; }

    [JsonPropertyName("amounts")]
    public Dictionary<string, long> Amounts { get; set; } = new Dictionary<string, long>();

    [JsonPropertyName("at")]
    public required string At { get; set; }

    [JsonPropertyName("boostId")]
    public string? BoostId { get; set; }

    [JsonPropertyName("by")]
    public AdAuditEntryBy? By { get; set; }

    [JsonPropertyName("currency")]
    public string? Currency { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

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
