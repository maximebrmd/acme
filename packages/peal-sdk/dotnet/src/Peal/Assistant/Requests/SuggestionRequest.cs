using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record SuggestionRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("action")]
    public required AssistantAction Action { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
