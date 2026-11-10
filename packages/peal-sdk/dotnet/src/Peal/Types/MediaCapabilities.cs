using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record MediaCapabilities : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("altText")]
    public required MediaCapabilitiesAltText AltText { get; set; }

    [JsonPropertyName("formats")]
    public IEnumerable<MediaFormat>? Formats { get; set; }

    [JsonPropertyName("maxCount")]
    public required int MaxCount { get; set; }

    [JsonPropertyName("maxVideos")]
    public int? MaxVideos { get; set; }

    [JsonPropertyName("mixesKinds")]
    public bool? MixesKinds { get; set; }

    [JsonPropertyName("required")]
    public required bool Required { get; set; }

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
