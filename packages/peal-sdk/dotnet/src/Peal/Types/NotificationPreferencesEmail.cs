using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NotificationPreferencesEmail : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelReconnect")]
    public required bool ChannelReconnect { get; set; }

    [JsonPropertyName("comments")]
    public required bool Comments { get; set; }

    [JsonPropertyName("feedStopped")]
    public required bool FeedStopped { get; set; }

    [JsonPropertyName("postFailed")]
    public required bool PostFailed { get; set; }

    [JsonPropertyName("postPublished")]
    public required bool PostPublished { get; set; }

    [JsonPropertyName("postReview")]
    public required bool PostReview { get; set; }

    [JsonPropertyName("postUnconfirmed")]
    public required bool PostUnconfirmed { get; set; }

    [JsonPropertyName("recyclingEnded")]
    public required bool RecyclingEnded { get; set; }

    [JsonPropertyName("webhookFailing")]
    public required bool WebhookFailing { get; set; }

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
