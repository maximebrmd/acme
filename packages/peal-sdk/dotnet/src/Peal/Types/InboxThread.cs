using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxThread : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("collectionEnded")]
    public InboxCollectionEnd? CollectionEnded { get; set; }

    [JsonPropertyName("comments")]
    public required int Comments { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("lastCollectedAt")]
    public string? LastCollectedAt { get; set; }

    [JsonPropertyName("lastCommentAt")]
    public string? LastCommentAt { get; set; }

    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("publishedAt")]
    public required string PublishedAt { get; set; }

    [JsonPropertyName("targetId")]
    public required string TargetId { get; set; }

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
