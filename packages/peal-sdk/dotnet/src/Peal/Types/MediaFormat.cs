using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record MediaFormat : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("contentType")]
    public required MediaContentType ContentType { get; set; }

    [JsonPropertyName("kind")]
    public required MediaKind Kind { get; set; }

    [JsonPropertyName("maxAspectRatio")]
    public double? MaxAspectRatio { get; set; }

    [JsonPropertyName("maxByteSize")]
    public long? MaxByteSize { get; set; }

    [JsonPropertyName("maxDurationMs")]
    public int? MaxDurationMs { get; set; }

    [JsonPropertyName("maxMediaWith")]
    public int? MaxMediaWith { get; set; }

    [JsonPropertyName("maxPixels")]
    public int? MaxPixels { get; set; }

    [JsonPropertyName("maxSide")]
    public int? MaxSide { get; set; }

    [JsonPropertyName("minAspectRatio")]
    public double? MinAspectRatio { get; set; }

    [JsonPropertyName("minByteSize")]
    public long? MinByteSize { get; set; }

    [JsonPropertyName("minDurationMs")]
    public int? MinDurationMs { get; set; }

    [JsonPropertyName("minSide")]
    public int? MinSide { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
