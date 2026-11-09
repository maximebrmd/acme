using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a TikTok account. Scheduling needs `privacyLevel`.
/// </summary>
[Serializable]
public record TikTokOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("aiGenerated")]
    public bool? AiGenerated { get; set; }

    [JsonPropertyName("brandContent")]
    public bool? BrandContent { get; set; }

    [JsonPropertyName("brandOrganic")]
    public bool? BrandOrganic { get; set; }

    [JsonPropertyName("commercialContent")]
    public bool? CommercialContent { get; set; }

    [JsonPropertyName("disableComment")]
    public bool? DisableComment { get; set; }

    [JsonPropertyName("disableDuet")]
    public bool? DisableDuet { get; set; }

    [JsonPropertyName("disableStitch")]
    public bool? DisableStitch { get; set; }

    [JsonPropertyName("privacyLevel")]
    public TikTokPrivacyLevel? PrivacyLevel { get; set; }

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
