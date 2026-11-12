using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record FeedPreviewRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("template")]
    public string? Template { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
