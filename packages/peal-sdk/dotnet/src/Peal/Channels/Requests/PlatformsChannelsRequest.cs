using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PlatformsChannelsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
