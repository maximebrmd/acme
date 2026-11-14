using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxConversationDetail : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("abilities")]
    public required InboxMessageAbilities Abilities { get; set; }

    [JsonPropertyName("conversation")]
    public required InboxConversation Conversation { get; set; }

    [JsonPropertyName("messages")]
    public IEnumerable<InboxDirectMessage> Messages { get; set; } = new List<InboxDirectMessage>();

    [JsonPropertyName("platform")]
    public Platform? Platform { get; set; }

    [JsonPropertyName("sent")]
    public IEnumerable<InboxOutgoingMessage> Sent { get; set; } = new List<InboxOutgoingMessage>();

    [JsonPropertyName("window")]
    public required InboxReplyWindow Window { get; set; }

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
