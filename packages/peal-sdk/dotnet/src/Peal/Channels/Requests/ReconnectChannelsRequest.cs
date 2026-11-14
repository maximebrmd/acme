using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ReconnectChannelsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string ChannelId { get; set; }

    [JsonIgnore]
    public ReconnectChannelsRequestMessages? Messages { get; set; }

    [JsonIgnore]
    public ReconnectChannelsRequestReposts? Reposts { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
