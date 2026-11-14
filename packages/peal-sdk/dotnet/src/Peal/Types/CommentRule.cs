using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record CommentRule : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public string? ChannelId { get; set; }

    [JsonPropertyName("channels")]
    public IEnumerable<ChannelCommentRule> Channels { get; set; } = new List<ChannelCommentRule>();

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("endedReason")]
    public CommentRuleEndReason? EndedReason { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("keywords")]
    public IEnumerable<string> Keywords { get; set; } = new List<string>();

    [JsonPropertyName("matches")]
    public IEnumerable<CommentRuleMatch> Matches { get; set; } = new List<CommentRuleMatch>();

    [JsonPropertyName("postId")]
    public string? PostId { get; set; }

    [JsonPropertyName("reply")]
    public required string Reply { get; set; }

    [JsonPropertyName("startedBy")]
    public string? StartedBy { get; set; }

    [JsonPropertyName("status")]
    public required CommentRuleStatus Status { get; set; }

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
