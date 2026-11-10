using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ApprovalOutcome : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("approval")]
    public required ApprovalRequest Approval { get; set; }

    [JsonPropertyName("late")]
    public required bool Late { get; set; }

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
