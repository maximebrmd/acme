using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record TargetMetrics : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("collecting")]
    public required bool Collecting { get; set; }

    [JsonPropertyName("lastCollectedAt")]
    public string? LastCollectedAt { get; set; }

    [JsonPropertyName("latest")]
    public PostMetrics? Latest { get; set; }

    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }

    [JsonPropertyName("publishedAt")]
    public required string PublishedAt { get; set; }

    [JsonPropertyName("snapshots")]
    public IEnumerable<MetricsSnapshot> Snapshots { get; set; } = new List<MetricsSnapshot>();

    [JsonPropertyName("targetId")]
    public required string TargetId { get; set; }

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
