using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a YouTube channel. Scheduling needs `title` and `madeForKids`.
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

    [JsonPropertyName("madeForKids")]
    public bool? MadeForKids { get; set; }

    [JsonPropertyName("notifySubscribers")]
    public bool? NotifySubscribers { get; set; }

    [JsonPropertyName("privacy")]
    public YouTubePrivacy? Privacy { get; set; }

    [JsonPropertyName("tags")]
    public IEnumerable<string>? Tags { get; set; }

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
