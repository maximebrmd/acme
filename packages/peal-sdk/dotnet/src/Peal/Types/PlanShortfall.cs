using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PlanShortfall : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("allowed")]
    public required int Allowed { get; set; }

    [JsonPropertyName("billingUrl")]
    public required string BillingUrl { get; set; }

    [JsonPropertyName("limit")]
    public required PlanLimit Limit { get; set; }

    [JsonPropertyName("plan")]
    public required Plan Plan { get; set; }

    [JsonPropertyName("planWithRoom")]
    public PaidPlan? PlanWithRoom { get; set; }

    [JsonPropertyName("used")]
    public required int Used { get; set; }

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
