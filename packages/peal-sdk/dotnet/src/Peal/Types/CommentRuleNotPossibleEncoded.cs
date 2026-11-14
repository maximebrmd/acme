using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record CommentRuleNotPossibleEncoded : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("_tag")]
    public required CommentRuleNotPossibleEncodedTag Tag { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    [JsonPropertyName("channels")]
    public IEnumerable<ChannelCommentRule> Channels { get; set; } = new List<ChannelCommentRule>();

    [JsonPropertyName("reason")]
    public required CommentRuleRefusal Reason { get; set; }

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
