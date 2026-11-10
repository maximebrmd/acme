using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record CustomerWorkspaceChange
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
