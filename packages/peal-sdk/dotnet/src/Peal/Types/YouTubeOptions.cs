using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`; `thumbnailMediaId` names an image of the library, set once the video is uploaded.
/// </summary>
[Serializable]
public record YouTubeOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("categoryId")]
    public string? CategoryId { get; set; }

    [JsonPropertyName("containsSyntheticMedia")]
    public bool? ContainsSyntheticMedia { get; set; }

    [JsonPropertyName("defaultLanguage")]
    public string? DefaultLanguage { get; set; }

    [JsonPropertyName("embeddable")]
    public bool? Embeddable { get; set; }

    [JsonPropertyName("license")]
    public YouTubeLicense? License { get; set; }

    [JsonPropertyName("madeForKids")]
    public bool? MadeForKids { get; set; }

    [JsonPropertyName("notifySubscribers")]
    public bool? NotifySubscribers { get; set; }

    [JsonPropertyName("privacy")]
    public YouTubePrivacy? Privacy { get; set; }

    [JsonPropertyName("publicStatsViewable")]
    public bool? PublicStatsViewable { get; set; }

    [JsonPropertyName("recordingDate")]
    public string? RecordingDate { get; set; }

    [JsonPropertyName("tags")]
    public IEnumerable<string>? Tags { get; set; }

    [JsonPropertyName("thumbnailMediaId")]
    public string? ThumbnailMediaId { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

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
