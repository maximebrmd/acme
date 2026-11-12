using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record BillingAccount : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("billingWorkspaceId")]
    public required string BillingWorkspaceId { get; set; }

    [JsonPropertyName("billingWorkspaceName")]
    public string? BillingWorkspaceName { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("otherWorkspaces")]
    public IEnumerable<AccountWorkspace> OtherWorkspaces { get; set; } =
        new List<AccountWorkspace>();

    [JsonPropertyName("partner")]
    public required bool Partner { get; set; }

    [JsonPropertyName("payer")]
    public required bool Payer { get; set; }

    [JsonPropertyName("transfer")]
    public BillingTransfer? Transfer { get; set; }

    [JsonPropertyName("workspaces")]
    public required int Workspaces { get; set; }

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
