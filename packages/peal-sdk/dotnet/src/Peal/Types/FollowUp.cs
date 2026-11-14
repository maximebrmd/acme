using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record FollowUp : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("armedAt")]
    public required string ArmedAt { get; set; }

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("kind")]
    public required FollowUpKind Kind { get; set; }

    [JsonPropertyName("likes")]
    public int? Likes { get; set; }

    [JsonPropertyName("permalink")]
    public string? Permalink { get; set; }

    [JsonPropertyName("platformPostId")]
    public string? PlatformPostId { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("sentAt")]
    public string? SentAt { get; set; }

    [JsonPropertyName("status")]
    public required FollowUpStatus Status { get; set; }

    [JsonPropertyName("targetId")]
    public required string TargetId { get; set; }

    [JsonPropertyName("triggeredAt")]
    public string? TriggeredAt { get; set; }

    [JsonPropertyName("until")]
    public string? Until { get; set; }

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
