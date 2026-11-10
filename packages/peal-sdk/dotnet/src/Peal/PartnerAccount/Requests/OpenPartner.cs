using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record OpenPartner
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
