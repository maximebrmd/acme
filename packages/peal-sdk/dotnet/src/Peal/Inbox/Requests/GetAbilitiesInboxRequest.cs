using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record GetAbilitiesInboxRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string ChannelId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
