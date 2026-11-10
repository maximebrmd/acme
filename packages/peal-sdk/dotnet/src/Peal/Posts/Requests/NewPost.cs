using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewPost
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string> ChannelIds { get; set; } = new List<string>();

    [JsonPropertyName("content")]
    public required PostContent Content { get; set; }

    [JsonPropertyName("options")]
    public IEnumerable<ChannelOptions>? Options { get; set; }

    [JsonPropertyName("when")]
    public required PostTiming When { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
