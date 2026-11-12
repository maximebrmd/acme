using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record StatusShortLinksRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
