using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a Facebook Page. Scheduling needs none of them; `format` makes it a `story`, sent without the post's text, or a `reel`; `videoTitle` is for a post of a video or a reel.
/// </summary>
[Serializable]
public record FacebookOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("format")]
    public FacebookFormat? Format { get; set; }

    [JsonPropertyName("videoTitle")]
    public string? VideoTitle { get; set; }

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
