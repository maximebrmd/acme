using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record BillingAccountsUsage : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("accountDays")]
    public long? AccountDays { get; set; }

    [JsonPropertyName("connected")]
    public required int Connected { get; set; }

    [JsonPropertyName("estimate")]
    public Money? Estimate { get; set; }

    [JsonPropertyName("nextAccount")]
    public Money? NextAccount { get; set; }

    [JsonPropertyName("pooled")]
    public required int Pooled { get; set; }

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
