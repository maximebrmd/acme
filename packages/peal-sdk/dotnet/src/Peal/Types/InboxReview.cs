using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxReview : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("markedAnswered")]
    public required bool MarkedAnswered { get; set; }

    [JsonPropertyName("photos")]
    public required int Photos { get; set; }

    [JsonPropertyName("rating")]
    public required int Rating { get; set; }

    [JsonPropertyName("receivedAt")]
    public required string ReceivedAt { get; set; }

    [JsonPropertyName("reply")]
    public InboxOwnerReply? Reply { get; set; }

    [JsonPropertyName("reviewerName")]
    public string? ReviewerName { get; set; }

    [JsonPropertyName("state")]
    public required InboxReviewState State { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

    [JsonPropertyName("threadId")]
    public required string ThreadId { get; set; }

    [JsonPropertyName("updatedAt")]
    public required string UpdatedAt { get; set; }

    [JsonPropertyName("writtenAt")]
    public required string WrittenAt { get; set; }

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
