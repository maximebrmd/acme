using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record WorkspaceUsageReport : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("allowances")]
    public PlanAllowances? Allowances { get; set; }

    [JsonPropertyName("current")]
    public required Usage Current { get; set; }

    [JsonPropertyName("days")]
    public IEnumerable<UsageDay> Days { get; set; } = new List<UsageDay>();

    [JsonPropertyName("period")]
    public required UsagePeriod Period { get; set; }

    [JsonPropertyName("plan")]
    public Plan? Plan { get; set; }

    [JsonPropertyName("sharedWith")]
    public UsageSharing? SharedWith { get; set; }

    [JsonPropertyName("totals")]
    public required UsageTotals Totals { get; set; }

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
