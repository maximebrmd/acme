using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record LeaveOutRestPostsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonIgnore]
    public required string TargetId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
