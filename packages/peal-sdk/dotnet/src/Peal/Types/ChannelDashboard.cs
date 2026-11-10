using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ChannelDashboard : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("followers")]
    public required FollowerChange Followers { get; set; }

    [JsonPropertyName("previousFollowers")]
    public required FollowerChange PreviousFollowers { get; set; }

    /// <summary>
    /// Whether the range before is still all kept. False when a platform's terms keep its numbers for less than the range before goes back (Pinterest 90 days, LinkedIn pages a year): previousTotals and previousFollowers then miss what was deleted, and no change against them should be shown.
    /// </summary>
    [JsonPropertyName("previousKept")]
    public required bool PreviousKept { get; set; }

    [JsonPropertyName("previousTotals")]
    public required DashboardTotals PreviousTotals { get; set; }

    [JsonPropertyName("totals")]
    public required DashboardTotals Totals { get; set; }

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("platform")]
    public Platform? Platform { get; set; }

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
