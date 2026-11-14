using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostTarget : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("dropped")]
    public bool? Dropped { get; set; }

    [JsonPropertyName("editedAt")]
    public string? EditedAt { get; set; }

    [JsonPropertyName("failureReason")]
    public FailureReason? FailureReason { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("keptPrivate")]
    public bool? KeptPrivate { get; set; }

    [JsonPropertyName("options")]
    public TargetOptions? Options { get; set; }

    [JsonPropertyName("parts")]
    public required TargetParts Parts { get; set; }

    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }

    [JsonPropertyName("publishedAt")]
    public string? PublishedAt { get; set; }

    [JsonPropertyName("removedAt")]
    public string? RemovedAt { get; set; }

    [JsonPropertyName("partsLeftOut")]
    public bool? PartsLeftOut { get; set; }

    [JsonPropertyName("round")]
    public required int Round { get; set; }

    [JsonPropertyName("status")]
    public required PostTargetStatus Status { get; set; }

    [JsonPropertyName("thumbnailNotSet")]
    public bool? ThumbnailNotSet { get; set; }

    [JsonPropertyName("unconfirmedReason")]
    public UnconfirmedReason? UnconfirmedReason { get; set; }

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
