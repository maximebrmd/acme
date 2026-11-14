using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ArticleStatePublished : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("scheduledAt")]
    public required string ScheduledAt { get; set; }

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

    [JsonPropertyName("editedAt")]
    public string? EditedAt { get; set; }

    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }

    [JsonPropertyName("platformPostId")]
    public required string PlatformPostId { get; set; }

    [JsonPropertyName("publishedAt")]
    public required string PublishedAt { get; set; }

    [JsonPropertyName("removedAt")]
    public string? RemovedAt { get; set; }

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
