using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AssistantMonth : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("allowance")]
    public required int Allowance { get; set; }

    [JsonPropertyName("ceiling")]
    public required Money Ceiling { get; set; }

    [JsonPropertyName("most")]
    public required int Most { get; set; }

    [JsonPropertyName("price")]
    public required UnitPrice Price { get; set; }

    [JsonPropertyName("priceConfirmed")]
    public required bool PriceConfirmed { get; set; }

    [JsonPropertyName("resetsAt")]
    public required string ResetsAt { get; set; }

    [JsonPropertyName("used")]
    public required int Used { get; set; }

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
