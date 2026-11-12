using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record Feed : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("attachPicture")]
    public required bool AttachPicture { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string> ChannelIds { get; set; } = new List<string>();

    [JsonPropertyName("channelSetId")]
    public string? ChannelSetId { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("failingSince")]
    public string? FailingSince { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("lastCheckedAt")]
    public string? LastCheckedAt { get; set; }

    [JsonPropertyName("lastFailure")]
    public FeedFailure? LastFailure { get; set; }

    [JsonPropertyName("mode")]
    public required FeedMode Mode { get; set; }

    [JsonPropertyName("nextCheckAt")]
    public required string NextCheckAt { get; set; }

    [JsonPropertyName("queueId")]
    public string? QueueId { get; set; }

    [JsonPropertyName("since")]
    public required string Since { get; set; }

    [JsonPropertyName("startedBy")]
    public string? StartedBy { get; set; }

    [JsonPropertyName("startedVia")]
    public required PostOrigin StartedVia { get; set; }

    [JsonPropertyName("status")]
    public required FeedStatus Status { get; set; }

    [JsonPropertyName("statusAt")]
    public string? StatusAt { get; set; }

    [JsonPropertyName("stopReason")]
    public FeedStoppedReason? StopReason { get; set; }

    [JsonPropertyName("template")]
    public required string Template { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

    [JsonPropertyName("updatedAt")]
    public required string UpdatedAt { get; set; }

    [JsonPropertyName("url")]
    public required string Url { get; set; }

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
