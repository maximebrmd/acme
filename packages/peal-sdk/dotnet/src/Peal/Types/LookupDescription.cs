using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record LookupDescription : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("fills")]
    public IEnumerable<string> Fills { get; set; } = new List<string>();

    [JsonPropertyName("input")]
    public IEnumerable<FieldDescription> Input { get; set; } = new List<FieldDescription>();

    [JsonPropertyName("name")]
    public required LookupName Name { get; set; }

    [JsonPropertyName("paged")]
    public required bool Paged { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

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
