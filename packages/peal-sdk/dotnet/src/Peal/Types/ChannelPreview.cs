using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ChannelPreview : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("hashtags")]
    public required LimitedCount Hashtags { get; set; }

    [JsonPropertyName("links")]
    public required LimitedCount Links { get; set; }

    [JsonPropertyName("media")]
    public required LimitedCount Media { get; set; }

    [JsonPropertyName("mentions")]
    public required LimitedCount Mentions { get; set; }

    [JsonPropertyName("parts")]
    public IEnumerable<PartPreview> Parts { get; set; } = new List<PartPreview>();

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

    [JsonPropertyName("textCounts")]
    public IEnumerable<TextCount> TextCounts { get; set; } = new List<TextCount>();

    [JsonPropertyName("textNotSent")]
    public bool? TextNotSent { get; set; }

    [JsonPropertyName("violations")]
    public IEnumerable<ContentViolation> Violations { get; set; } = new List<ContentViolation>();

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
