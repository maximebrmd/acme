using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostToValidate
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("allowDuplicate")]
    public bool? AllowDuplicate { get; set; }

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

    [JsonPropertyName("when")]
    public PostTiming? When { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
