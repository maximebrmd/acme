using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a LinkedIn profile or company page. Scheduling needs none of them; a link (`linkUrl`) needs its `linkTitle`.
/// </summary>
[Serializable]
public record LinkedInOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("disableReshare")]
    public bool? DisableReshare { get; set; }

    [JsonPropertyName("documentTitle")]
    public string? DocumentTitle { get; set; }

    [JsonPropertyName("linkDescription")]
    public string? LinkDescription { get; set; }

    [JsonPropertyName("linkTitle")]
    public string? LinkTitle { get; set; }

    [JsonPropertyName("linkUrl")]
    public string? LinkUrl { get; set; }

    [JsonPropertyName("mentions")]
    public IEnumerable<LinkedInMention>? Mentions { get; set; }

    [JsonPropertyName("visibility")]
    public LinkedInVisibility? Visibility { get; set; }

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
