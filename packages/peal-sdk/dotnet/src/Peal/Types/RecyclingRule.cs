using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RecyclingRule : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("anchorAt")]
    public required string AnchorAt { get; set; }

    [JsonPropertyName("coming")]
    public IEnumerable<RecyclingComing> Coming { get; set; } = new List<RecyclingComing>();

    [JsonPropertyName("count")]
    public int? Count { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("endedReason")]
    public RecyclingEndReason? EndedReason { get; set; }

    [JsonPropertyName("every")]
    public required RecyclingInterval Every { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("lastDueAt")]
    public required string LastDueAt { get; set; }

    [JsonPropertyName("made")]
    public required int Made { get; set; }

    [JsonPropertyName("nextDueAt")]
    public string? NextDueAt { get; set; }

    [JsonPropertyName("queueId")]
    public string? QueueId { get; set; }

    [JsonPropertyName("sourcePostId")]
    public required string SourcePostId { get; set; }

    [JsonPropertyName("startedBy")]
    public string? StartedBy { get; set; }

    [JsonPropertyName("startedVia")]
    public required PostOrigin StartedVia { get; set; }

    [JsonPropertyName("status")]
    public required RecyclingStatus Status { get; set; }

    [JsonPropertyName("timeZone")]
    public required string TimeZone { get; set; }

    [JsonPropertyName("until")]
    public string? Until { get; set; }

    [JsonPropertyName("variants")]
    public IEnumerable<RecyclingRuleVariantsItem> Variants { get; set; } =
        new List<RecyclingRuleVariantsItem>();

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
