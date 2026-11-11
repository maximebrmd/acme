using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on an X account. Scheduling needs none of them; `shareWithFollowers` needs `communityId`.
/// </summary>
[Serializable]
public record XOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("communityId")]
    public string? CommunityId { get; set; }

    [JsonPropertyName("madeWithAi")]
    public bool? MadeWithAi { get; set; }

    [JsonPropertyName("paidPartnership")]
    public bool? PaidPartnership { get; set; }

    [JsonPropertyName("replySettings")]
    public XReplySettings? ReplySettings { get; set; }

    [JsonPropertyName("shareWithFollowers")]
    public bool? ShareWithFollowers { get; set; }

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
