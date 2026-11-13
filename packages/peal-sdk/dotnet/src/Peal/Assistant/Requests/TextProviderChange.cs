using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record TextProviderChange
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("apiKey")]
    public string? ApiKey { get; set; }

    [JsonPropertyName("baseUrl")]
    public required string BaseUrl { get; set; }

    [JsonPropertyName("kind")]
    public required TextProviderKind Kind { get; set; }

    [JsonPropertyName("model")]
    public required string Model { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
