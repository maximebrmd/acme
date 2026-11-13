using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostContent : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("followUps")]
    public IEnumerable<PostPart>? FollowUps { get; set; }

    [JsonPropertyName("media")]
    public IEnumerable<MediaAttachment> Media { get; set; } = new List<MediaAttachment>();

    [JsonPropertyName("overrides")]
    public IEnumerable<TextOverride> Overrides { get; set; } = new List<TextOverride>();

    [JsonPropertyName("poll")]
    public Poll? Poll { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

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
