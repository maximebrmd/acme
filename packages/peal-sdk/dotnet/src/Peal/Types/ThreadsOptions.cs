using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a Threads account. Scheduling needs none of them; `linkAttachment` is for a post without media.
/// </summary>
[Serializable]
public record ThreadsOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("linkAttachment")]
    public string? LinkAttachment { get; set; }

    [JsonPropertyName("replyControl")]
    public ThreadsReplyControl? ReplyControl { get; set; }

    [JsonPropertyName("topicTag")]
    public string? TopicTag { get; set; }

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
