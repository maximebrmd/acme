using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record SetAnsweredInboxRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string CommentId { get; set; }

    [JsonPropertyName("answered")]
    public required bool Answered { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
