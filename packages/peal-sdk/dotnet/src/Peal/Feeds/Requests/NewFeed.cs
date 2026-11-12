using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewFeed
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("attachPicture")]
    public bool? AttachPicture { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string>? ChannelIds { get; set; }

    [JsonPropertyName("channelSetId")]
    public string? ChannelSetId { get; set; }

    [JsonPropertyName("mode")]
    public FeedMode? Mode { get; set; }

    [JsonPropertyName("queueId")]
    public string? QueueId { get; set; }

    [JsonPropertyName("template")]
    public string? Template { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
