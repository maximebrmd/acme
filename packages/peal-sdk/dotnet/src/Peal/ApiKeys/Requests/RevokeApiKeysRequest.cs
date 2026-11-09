using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RevokeApiKeysRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string ApiKeyId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
