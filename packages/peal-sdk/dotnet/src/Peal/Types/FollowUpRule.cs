using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record FollowUpRule : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("approval")]
    public required FollowUpApprovalState Approval { get; set; }

    [JsonPropertyName("approvedAt")]
    public string? ApprovedAt { get; set; }

    [JsonPropertyName("approvedBy")]
    public string? ApprovedBy { get; set; }

    [JsonPropertyName("channels")]
    public IEnumerable<ChannelFollowUps> Channels { get; set; } = new List<ChannelFollowUps>();

    [JsonPropertyName("channelId")]
    public string? ChannelId { get; set; }

    [JsonPropertyName("comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("endedReason")]
    public FollowUpEndReason? EndedReason { get; set; }

    [JsonPropertyName("followUps")]
    public IEnumerable<FollowUp> FollowUps { get; set; } = new List<FollowUp>();

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("likes")]
    public required int Likes { get; set; }

    [JsonPropertyName("postId")]
    public string? PostId { get; set; }

    [JsonPropertyName("repost")]
    public required bool Repost { get; set; }

    [JsonPropertyName("startedBy")]
    public string? StartedBy { get; set; }

    [JsonPropertyName("startedVia")]
    public required PostOrigin StartedVia { get; set; }

    [JsonPropertyName("status")]
    public required FollowUpRuleStatus Status { get; set; }

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
