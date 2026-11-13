using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ReviewedChannel : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("followUps")]
    public IEnumerable<ReviewedPart> FollowUps { get; set; } = new List<ReviewedPart>();

    [JsonPropertyName("handle")]
    public string? Handle { get; set; }

    [JsonPropertyName("media")]
    public IEnumerable<ReviewedMedia>? Media { get; set; }

    [JsonPropertyName("options")]
    public TargetOptions? Options { get; set; }

    [JsonPropertyName("platform")]
    public Platform? Platform { get; set; }

    [JsonPropertyName("text")]
    public required string Text { get; set; }

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
