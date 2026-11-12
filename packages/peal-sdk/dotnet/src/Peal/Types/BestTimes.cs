using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record BestTimes : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("best")]
    public IEnumerable<BestTimesHour> Best { get; set; } = new List<BestTimesHour>();

    [JsonPropertyName("buckets")]
    public IEnumerable<BestTimesHour> Buckets { get; set; } = new List<BestTimesHour>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("counted")]
    public required bool Counted { get; set; }

    [JsonPropertyName("days")]
    public required int Days { get; set; }

    [JsonPropertyName("enough")]
    public required bool Enough { get; set; }

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("minimumPosts")]
    public required int MinimumPosts { get; set; }

    [JsonPropertyName("minimumPostsPerHour")]
    public required int MinimumPostsPerHour { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

    [JsonPropertyName("posts")]
    public required int Posts { get; set; }

    [JsonPropertyName("recent")]
    public required int Recent { get; set; }

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

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
