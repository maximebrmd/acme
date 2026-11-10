using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a Pinterest account, as a Pin. Scheduling needs `boardId`.
/// </summary>
[Serializable]
public record PinterestOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("boardId")]
    public string? BoardId { get; set; }

    [JsonPropertyName("boardSectionId")]
    public string? BoardSectionId { get; set; }

    [JsonPropertyName("coverSecond")]
    public int? CoverSecond { get; set; }

    [JsonPropertyName("dominantColor")]
    public string? DominantColor { get; set; }

    [JsonPropertyName("link")]
    public string? Link { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

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
