using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxOutgoingMessage : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("authorId")]
    public string? AuthorId { get; set; }

    [JsonPropertyName("conversationId")]
    public required string ConversationId { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("platformMessageId")]
    public string? PlatformMessageId { get; set; }

    [JsonPropertyName("reason")]
    public InboxOutgoingMessageReason? Reason { get; set; }

    [JsonPropertyName("settledAt")]
    public string? SettledAt { get; set; }

    [JsonPropertyName("status")]
    public required InboxOutgoingMessageStatus Status { get; set; }

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
