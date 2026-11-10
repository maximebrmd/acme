using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ApprovalRequest : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("decision")]
    public ApprovalRequestDecision? Decision { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("requestedAt")]
    public required string RequestedAt { get; set; }

    [JsonPropertyName("requestedBy")]
    public string? RequestedBy { get; set; }

    [JsonPropertyName("requestedByName")]
    public string? RequestedByName { get; set; }

    [JsonPropertyName("requestedVia")]
    public required ApprovalOrigin RequestedVia { get; set; }

    [JsonPropertyName("schedule")]
    public required PostSchedule Schedule { get; set; }

    [JsonPropertyName("status")]
    public required ApprovalStatus Status { get; set; }

    [JsonPropertyName("subjectHash")]
    public required string SubjectHash { get; set; }

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
