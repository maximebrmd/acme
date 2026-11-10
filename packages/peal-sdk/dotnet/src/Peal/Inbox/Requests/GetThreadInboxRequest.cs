using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record GetThreadInboxRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string ThreadId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
