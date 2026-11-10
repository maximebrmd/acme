using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record OutcomePostsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonIgnore]
    public string? Wait { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
