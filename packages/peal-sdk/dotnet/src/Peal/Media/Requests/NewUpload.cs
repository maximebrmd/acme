using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewUpload
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("altText")]
    public string? AltText { get; set; }

    [JsonPropertyName("byteSize")]
    public required long ByteSize { get; set; }

    [JsonPropertyName("contentType")]
    public required string ContentType { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
