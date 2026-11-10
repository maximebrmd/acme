using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record TextCapabilities : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("forbiddenCharacters")]
    public IEnumerable<string> ForbiddenCharacters { get; set; } = new List<string>();

    [JsonPropertyName("limits")]
    public IEnumerable<TextLimit> Limits { get; set; } = new List<TextLimit>();

    [JsonPropertyName("maxHashtags")]
    public int? MaxHashtags { get; set; }

    [JsonPropertyName("maxLinks")]
    public int? MaxLinks { get; set; }

    [JsonPropertyName("maxMentions")]
    public int? MaxMentions { get; set; }

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
