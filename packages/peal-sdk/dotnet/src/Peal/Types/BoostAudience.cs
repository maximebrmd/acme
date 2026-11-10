using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// Who a boost is shown to: people in some countries (ISO 3166-1 alpha-2 codes in capitals, 25 at most), between two ages (18 to 65, 65 meaning "65 and over"). Nothing finer.
/// </summary>
[Serializable]
public record BoostAudience : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("ageMax")]
    public required int AgeMax { get; set; }

    [JsonPropertyName("ageMin")]
    public required int AgeMin { get; set; }

    [JsonPropertyName("countries")]
    public IEnumerable<string> Countries { get; set; } = new List<string>();

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
