using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ApiChangelogEntry : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("additions")]
    public required int Additions { get; set; }

    [JsonPropertyName("breaking")]
    public IEnumerable<BreakingChange> Breaking { get; set; } = new List<BreakingChange>();

    [JsonPropertyName("date")]
    public required string Date { get; set; }

    [JsonPropertyName("deprecations")]
    public IEnumerable<string> Deprecations { get; set; } = new List<string>();

    [JsonPropertyName("operations")]
    public IEnumerable<string> Operations { get; set; } = new List<string>();

    [JsonPropertyName("title")]
    public required string Title { get; set; }

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
