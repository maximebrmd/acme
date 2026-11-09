using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ChannelMetrics : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("impressions")]
    public int? Impressions { get; set; }

    [JsonPropertyName("likes")]
    public required int Likes { get; set; }

    [JsonPropertyName("posts")]
    public required int Posts { get; set; }

    [JsonPropertyName("quotes")]
    public int? Quotes { get; set; }

    [JsonPropertyName("replies")]
    public required int Replies { get; set; }

    [JsonPropertyName("reposts")]
    public required int Reposts { get; set; }

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

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
