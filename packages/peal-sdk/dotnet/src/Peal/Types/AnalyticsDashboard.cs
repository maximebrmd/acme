using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AnalyticsDashboard : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("followers")]
    public required FollowerChange Followers { get; set; }

    [JsonPropertyName("previousFollowers")]
    public required FollowerChange PreviousFollowers { get; set; }

    [JsonPropertyName("previousTotals")]
    public required DashboardTotals PreviousTotals { get; set; }

    [JsonPropertyName("totals")]
    public required DashboardTotals Totals { get; set; }

    [JsonPropertyName("channels")]
    public IEnumerable<ChannelDashboard> Channels { get; set; } = new List<ChannelDashboard>();

    [JsonPropertyName("days")]
    public IEnumerable<DashboardDay> Days { get; set; } = new List<DashboardDay>();

    [JsonPropertyName("from")]
    public required string From { get; set; }

    [JsonPropertyName("platforms")]
    public IEnumerable<PlatformDashboard> Platforms { get; set; } = new List<PlatformDashboard>();

    [JsonPropertyName("previous")]
    public required AnalyticsDashboardPrevious Previous { get; set; }

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

    [JsonPropertyName("to")]
    public required string To { get; set; }

    [JsonPropertyName("topPosts")]
    public IEnumerable<TopPost> TopPosts { get; set; } = new List<TopPost>();

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
