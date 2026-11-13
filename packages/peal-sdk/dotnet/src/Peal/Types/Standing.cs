using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record Standing : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("account")]
    public BillingAccount? Account { get; set; }

    [JsonPropertyName("graceUntil")]
    public string? GraceUntil { get; set; }

    [JsonPropertyName("mustReduce")]
    public required bool MustReduce { get; set; }

    [JsonPropertyName("over")]
    public IEnumerable<Excess> Over { get; set; } = new List<Excess>();

    [JsonPropertyName("plan")]
    public Plan? Plan { get; set; }

    [JsonPropertyName("planWithRoom")]
    public PaidPlan? PlanWithRoom { get; set; }

    [JsonPropertyName("scheduledPosts")]
    public required int ScheduledPosts { get; set; }

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
