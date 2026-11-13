using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RateCardXRates : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("dmCreate")]
    public required int DmCreate { get; set; }

    [JsonPropertyName("dmEventRead")]
    public required int DmEventRead { get; set; }

    [JsonPropertyName("ownedRead")]
    public required int OwnedRead { get; set; }

    [JsonPropertyName("postCreate")]
    public required int PostCreate { get; set; }

    [JsonPropertyName("postCreateWithUrl")]
    public required int PostCreateWithUrl { get; set; }

    [JsonPropertyName("postRead")]
    public required int PostRead { get; set; }

    [JsonPropertyName("userRead")]
    public required int UserRead { get; set; }

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
