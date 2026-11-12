using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record FeedItem : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("itemAt")]
    public string? ItemAt { get; set; }

    [JsonPropertyName("outcome")]
    public required FeedItemOutcome Outcome { get; set; }

    [JsonPropertyName("pictureSkipped")]
    public FeedPictureSkip? PictureSkipped { get; set; }

    [JsonPropertyName("postId")]
    public string? PostId { get; set; }

    [JsonPropertyName("reason")]
    public FeedItemReason? Reason { get; set; }

    [JsonPropertyName("seenAt")]
    public required string SeenAt { get; set; }

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
