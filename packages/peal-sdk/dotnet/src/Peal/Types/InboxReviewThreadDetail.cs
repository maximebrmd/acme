using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxReviewThreadDetail : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("abilities")]
    public required InboxReviewAbilities Abilities { get; set; }

    [JsonPropertyName("platform")]
    public Platform? Platform { get; set; }

    [JsonPropertyName("replies")]
    public IEnumerable<InboxReviewReply> Replies { get; set; } = new List<InboxReviewReply>();

    [JsonPropertyName("reviews")]
    public IEnumerable<InboxReview> Reviews { get; set; } = new List<InboxReview>();

    [JsonPropertyName("thread")]
    public required InboxReviewThread Thread { get; set; }

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
