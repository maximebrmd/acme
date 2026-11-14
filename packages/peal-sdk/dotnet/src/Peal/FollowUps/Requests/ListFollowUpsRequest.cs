using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ListFollowUpsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? Cursor { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    [JsonIgnore]
    public string? PostId { get; set; }

    [JsonIgnore]
    public FollowUpRuleStatus? Status { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
