using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record OrganicCounts : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("impressions")]
    public int? Impressions { get; set; }

    [JsonPropertyName("likes")]
    public int? Likes { get; set; }

    [JsonPropertyName("readAt")]
    public string? ReadAt { get; set; }

    [JsonPropertyName("replies")]
    public int? Replies { get; set; }

    [JsonPropertyName("reposts")]
    public int? Reposts { get; set; }

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
