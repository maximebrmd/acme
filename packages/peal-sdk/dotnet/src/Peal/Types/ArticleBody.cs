using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// The rich-text editor's document: blocks of paragraphs, headings, lists, quotes, rules, code and images.
/// </summary>
[Serializable]
public record ArticleBody : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("content")]
    public IEnumerable<object> Content { get; set; } = new List<object>();

    [JsonPropertyName("type")]
    public required ArticleBodyType Type { get; set; }

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
