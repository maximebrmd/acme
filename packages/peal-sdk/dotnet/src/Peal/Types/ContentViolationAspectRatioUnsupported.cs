using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;
using Peal.Core;

namespace Peal;

[Serializable]
public record ContentViolationAspectRatioUnsupported : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("part")]
    public int? Part { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

    [JsonPropertyName("mediaId")]
    public required string MediaId { get; set; }

    [JsonPropertyName("height")]
    public required int Height { get; set; }

    [JsonPropertyName("width")]
    public required int Width { get; set; }

    [JsonPropertyName("maximum")]
    public required OneOf<double, NonFiniteNumber> Maximum { get; set; }

    [JsonPropertyName("minimum")]
    public required OneOf<double, NonFiniteNumber> Minimum { get; set; }

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
