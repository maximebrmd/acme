using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ApproveFollowUpsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string RuleId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
