using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record MediaImport
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("altText")]
    public string? AltText { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
