using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewFollowUpRule
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("channelId")]
    public string? ChannelId { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("likes")]
    public required int Likes { get; set; }

    [JsonPropertyName("postId")]
    public string? PostId { get; set; }

    [JsonPropertyName("repost")]
    public bool? Repost { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
