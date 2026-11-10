using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record BillingSubscription : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("cancelAtPeriodEnd")]
    public required bool CancelAtPeriodEnd { get; set; }

    [JsonPropertyName("currentPeriodEnd")]
    public string? CurrentPeriodEnd { get; set; }

    [JsonPropertyName("endsAt")]
    public string? EndsAt { get; set; }

    [JsonPropertyName("interval")]
    public required BillingInterval Interval { get; set; }

    [JsonPropertyName("plan")]
    public required PaidPlan Plan { get; set; }

    [JsonPropertyName("startedAt")]
    public string? StartedAt { get; set; }

    [JsonPropertyName("status")]
    public required SubscriptionStatus Status { get; set; }

    [JsonPropertyName("trialEnd")]
    public string? TrialEnd { get; set; }

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
