using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ResolveReviewRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonIgnore]
    public required string CommentId { get; set; }

    [JsonPropertyName("resolved")]
    public required bool Resolved { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
