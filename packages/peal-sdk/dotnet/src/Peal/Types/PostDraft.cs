using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostDraft : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelIds")]
    public IEnumerable<string> ChannelIds { get; set; } = new List<string>();

    [JsonPropertyName("channelSets")]
    public IEnumerable<string>? ChannelSets { get; set; }

    [JsonPropertyName("content")]
    public required PostContent Content { get; set; }

    [JsonPropertyName("defaultSignatures")]
    public bool? DefaultSignatures { get; set; }

    [JsonPropertyName("options")]
    public IEnumerable<ChannelOptions>? Options { get; set; }

    [JsonPropertyName("shortenLinks")]
    public bool? ShortenLinks { get; set; }

    [JsonPropertyName("signatureId")]
    public string? SignatureId { get; set; }

    [JsonPropertyName("tagIds")]
    public IEnumerable<string>? TagIds { get; set; }

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
