using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record FollowUpRuleChange
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string RuleId { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("likes")]
    public int? Likes { get; set; }

    [JsonPropertyName("paused")]
    public bool? Paused { get; set; }

    [JsonPropertyName("repost")]
    public bool? Repost { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
