using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ReviewComment : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("anchor")]
    public CommentAnchor? Anchor { get; set; }

    [JsonPropertyName("author")]
    public required Reviewer Author { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("parentId")]
    public string? ParentId { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("resolved")]
    public ReviewCommentResolved? Resolved { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

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
