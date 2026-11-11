using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record QueuePost
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string>? ChannelIds { get; set; }

    [JsonPropertyName("queueId")]
    public string? QueueId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
