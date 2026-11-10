using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AssistantQuotaExceededEncoded : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("message")]
    public string? Message { get; set; }

    [JsonPropertyName("requestId")]
    public string? RequestId { get; set; }

    [JsonPropertyName("billingUrl")]
    public string? BillingUrl { get; set; }

    [JsonPropertyName("dailyLimit")]
    public required int DailyLimit { get; set; }

    [JsonPropertyName("plan")]
    public Plan? Plan { get; set; }

    [JsonPropertyName("planWithRoom")]
    public PaidPlan? PlanWithRoom { get; set; }

    [JsonPropertyName("resetsAt")]
    public required string ResetsAt { get; set; }

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
