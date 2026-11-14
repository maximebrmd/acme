using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxReviewThread : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("averageRating")]
    public OneOf<double, NonFiniteNumber>? AverageRating { get; set; }

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("kind")]
    public required InboxReviewThreadKind Kind { get; set; }

    [JsonPropertyName("lastCollectedAt")]
    public string? LastCollectedAt { get; set; }

    [JsonPropertyName("lastReviewAt")]
    public string? LastReviewAt { get; set; }

    [JsonPropertyName("reviews")]
    public required int Reviews { get; set; }

    [JsonPropertyName("totalReviewCount")]
    public int? TotalReviewCount { get; set; }

    [JsonPropertyName("unanswered")]
    public required int Unanswered { get; set; }

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
