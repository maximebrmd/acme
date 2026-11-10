using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ChangesRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonPropertyName("approvalId")]
    public required string ApprovalId { get; set; }

    [JsonPropertyName("subjectHash")]
    public required string SubjectHash { get; set; }

    [JsonPropertyName("comment")]
    public required string Comment { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
