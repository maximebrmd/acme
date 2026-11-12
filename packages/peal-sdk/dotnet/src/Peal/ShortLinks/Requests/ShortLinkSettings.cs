using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ShortLinkSettings
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("byDefault")]
    public required bool ByDefault { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
