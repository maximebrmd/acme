using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PlatformCapabilities : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("analytics")]
    public required PlatformCapabilitiesAnalytics Analytics { get; set; }

    [JsonPropertyName("followUps")]
    public FollowUpCapabilities? FollowUps { get; set; }

    [JsonPropertyName("livePost")]
    public required LivePostCapabilities LivePost { get; set; }

    [JsonPropertyName("lookups")]
    public IEnumerable<LookupDescription> Lookups { get; set; } = new List<LookupDescription>();

    [JsonPropertyName("media")]
    public required MediaCapabilities Media { get; set; }

    [JsonPropertyName("options")]
    public required PlatformCapabilitiesOptions Options { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

    [JsonPropertyName("postFormats")]
    public IEnumerable<PostFormatCapabilities>? PostFormats { get; set; }

    [JsonPropertyName("text")]
    public required TextCapabilities Text { get; set; }

    [JsonPropertyName("version")]
    public required int Version { get; set; }

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
