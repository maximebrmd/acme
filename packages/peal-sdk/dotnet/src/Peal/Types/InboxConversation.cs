using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxConversation : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("lastIncomingAt")]
    public string? LastIncomingAt { get; set; }

    [JsonPropertyName("lastMessageAt")]
    public required string LastMessageAt { get; set; }

    [JsonPropertyName("messages")]
    public required int Messages { get; set; }

    [JsonPropertyName("participants")]
    public IEnumerable<InboxParticipant> Participants { get; set; } = new List<InboxParticipant>();

    [JsonPropertyName("readAt")]
    public string? ReadAt { get; set; }

    [JsonPropertyName("request")]
    public required bool Request { get; set; }

    [JsonPropertyName("unread")]
    public required bool Unread { get; set; }

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
