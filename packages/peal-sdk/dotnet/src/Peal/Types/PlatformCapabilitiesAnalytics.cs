using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PlatformCapabilitiesAnalytics : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("accountNumbers")]
    public IEnumerable<PlatformCapabilitiesAnalyticsAccountNumbersItem> AccountNumbers { get; set; } =
        new List<PlatformCapabilitiesAnalyticsAccountNumbersItem>();

    [JsonPropertyName("perPost")]
    public required bool PerPost { get; set; }

    [JsonPropertyName("postCounts")]
    public IEnumerable<PlatformCapabilitiesAnalyticsPostCountsItem> PostCounts { get; set; } =
        new List<PlatformCapabilitiesAnalyticsPostCountsItem>();

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
