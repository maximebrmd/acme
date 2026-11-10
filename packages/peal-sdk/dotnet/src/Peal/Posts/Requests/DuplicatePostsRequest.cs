using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record DuplicatePostsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
