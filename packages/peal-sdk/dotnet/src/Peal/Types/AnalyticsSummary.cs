using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AnalyticsSummary : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channels")]
    public IEnumerable<ChannelMetrics> Channels { get; set; } = new List<ChannelMetrics>();

    [JsonPropertyName("days")]
    public IEnumerable<EngagementDay> Days { get; set; } = new List<EngagementDay>();

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

    [JsonPropertyName("topPosts")]
    public IEnumerable<TopPost> TopPosts { get; set; } = new List<TopPost>();

    [JsonPropertyName("totals")]
    public required MetricTotals Totals { get; set; }

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
