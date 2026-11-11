using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a Bluesky account. Scheduling needs none of them; `replies` limited needs one of `replyFollowers`, `replyFollowing` and `replyMentioned`, and the two gates (`replies`, `disableQuotes`) a channel connected since Peal asks for their scopes.
/// </summary>
[Serializable]
public record BlueskyOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("contentLabel")]
    public BlueskyContentLabel? ContentLabel { get; set; }

    [JsonPropertyName("disableQuotes")]
    public bool? DisableQuotes { get; set; }

    [JsonPropertyName("languages")]
    public IEnumerable<string>? Languages { get; set; }

    [JsonPropertyName("replies")]
    public BlueskyReplies? Replies { get; set; }

    [JsonPropertyName("replyFollowers")]
    public bool? ReplyFollowers { get; set; }

    [JsonPropertyName("replyFollowing")]
    public bool? ReplyFollowing { get; set; }

    [JsonPropertyName("replyMentioned")]
    public bool? ReplyMentioned { get; set; }

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
