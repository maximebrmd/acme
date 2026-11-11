using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record WebhookBulkRedelivery : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("redelivered")]
    public IEnumerable<WebhookDelivery> Redelivered { get; set; } = new List<WebhookDelivery>();

    [JsonPropertyName("remaining")]
    public required int Remaining { get; set; }

    [JsonPropertyName("skipped")]
    public IEnumerable<WebhookRedeliverySkipped> Skipped { get; set; } =
        new List<WebhookRedeliverySkipped>();

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
