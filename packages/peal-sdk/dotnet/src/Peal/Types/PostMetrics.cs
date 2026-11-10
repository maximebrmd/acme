using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostMetrics : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("clicks")]
    public int? Clicks { get; set; }

    [JsonPropertyName("impressions")]
    public int? Impressions { get; set; }

    [JsonPropertyName("likes")]
    public required int Likes { get; set; }

    [JsonPropertyName("quotes")]
    public int? Quotes { get; set; }

    [JsonPropertyName("reach")]
    public int? Reach { get; set; }

    [JsonPropertyName("replies")]
    public required int Replies { get; set; }

    [JsonPropertyName("reposts")]
    public required int Reposts { get; set; }

    [JsonPropertyName("saves")]
    public int? Saves { get; set; }

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
