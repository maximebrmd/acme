using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;
using Peal.Core;

namespace Peal;

[Serializable]
public record FieldDescription : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("forbiddenCharacters")]
    public IEnumerable<string> ForbiddenCharacters { get; set; } = new List<string>();

    [JsonPropertyName("ifLeftOut")]
    public OneOf<bool, double, string>? IfLeftOut { get; set; }

    [JsonPropertyName("lookup")]
    public LookupName? Lookup { get; set; }

    [JsonPropertyName("maxLength")]
    public int? MaxLength { get; set; }

    [JsonPropertyName("maximum")]
    public int? Maximum { get; set; }

    [JsonPropertyName("minimum")]
    public int? Minimum { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("pattern")]
    public string? Pattern { get; set; }

    [JsonPropertyName("required")]
    public required bool Required { get; set; }

    [JsonPropertyName("type")]
    public required FieldType Type { get; set; }

    [JsonPropertyName("values")]
    public IEnumerable<string> Values { get; set; } = new List<string>();

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
