using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PartnerUsageReport : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("allowances")]
    public PlanAllowances? Allowances { get; set; }

    [JsonPropertyName("current")]
    public PartnerHoldings? Current { get; set; }

    [JsonPropertyName("days")]
    public IEnumerable<PartnerUsageReportDay>? Days { get; set; }

    [JsonPropertyName("period")]
    public required UsagePeriod Period { get; set; }

    [JsonPropertyName("plan")]
    public Plan? Plan { get; set; }

    [JsonPropertyName("totals")]
    public UsageTotals? Totals { get; set; }

    [JsonPropertyName("workspaces")]
    public required TenantUsagePage Workspaces { get; set; }

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
