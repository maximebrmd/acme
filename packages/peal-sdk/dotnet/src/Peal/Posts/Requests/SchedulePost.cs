using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record SchedulePost
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonPropertyName("at")]
    public required string At { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string> ChannelIds { get; set; } = new List<string>();

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
