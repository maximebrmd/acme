using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NotificationPreferencesChangeEmail : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelReconnect")]
    public bool? ChannelReconnect { get; set; }

    [JsonPropertyName("comments")]
    public bool? Comments { get; set; }

    [JsonPropertyName("postFailed")]
    public bool? PostFailed { get; set; }

    [JsonPropertyName("postPublished")]
    public bool? PostPublished { get; set; }

    [JsonPropertyName("postReview")]
    public bool? PostReview { get; set; }

    [JsonPropertyName("postUnconfirmed")]
    public bool? PostUnconfirmed { get; set; }

    [JsonPropertyName("recyclingEnded")]
    public bool? RecyclingEnded { get; set; }

    [JsonPropertyName("webhookFailing")]
    public bool? WebhookFailing { get; set; }

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
