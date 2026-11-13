using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record Billing : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("account")]
    public BillingAccount? Account { get; set; }

    [JsonPropertyName("accounts")]
    public required BillingAccountsUsage Accounts { get; set; }

    [JsonPropertyName("allowances")]
    public required PlanAllowances Allowances { get; set; }

    [JsonPropertyName("currency")]
    public required string Currency { get; set; }

    [JsonPropertyName("enabled")]
    public required bool Enabled { get; set; }

    [JsonPropertyName("estimate")]
    public Money? Estimate { get; set; }

    [JsonPropertyName("paymentMethod")]
    public required bool PaymentMethod { get; set; }

    [JsonPropertyName("plan")]
    public Plan? Plan { get; set; }

    [JsonPropertyName("plans")]
    public IEnumerable<PlanOffer> Plans { get; set; } = new List<PlanOffer>();

    [JsonPropertyName("rateCard")]
    public RateCard? RateCard { get; set; }

    [JsonPropertyName("subscription")]
    public BillingSubscription? Subscription { get; set; }

    [JsonPropertyName("trial")]
    public TrialOffer? Trial { get; set; }

    [JsonPropertyName("upcomingInvoice")]
    public Money? UpcomingInvoice { get; set; }

    [JsonPropertyName("usage")]
    public required Usage Usage { get; set; }

    [JsonPropertyName("vatRate")]
    public required int VatRate { get; set; }

    [JsonPropertyName("withdrawableUntil")]
    public string? WithdrawableUntil { get; set; }

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
