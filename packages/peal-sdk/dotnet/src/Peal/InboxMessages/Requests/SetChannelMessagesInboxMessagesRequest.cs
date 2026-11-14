using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record SetChannelMessagesInboxMessagesRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string ChannelId { get; set; }

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
