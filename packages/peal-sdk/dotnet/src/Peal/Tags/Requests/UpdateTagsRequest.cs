using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record UpdateTagsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string TagId { get; set; }

    [JsonIgnore]
    public required TagDetails Body { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
