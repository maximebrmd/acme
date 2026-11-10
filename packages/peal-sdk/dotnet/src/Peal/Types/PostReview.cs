using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostReview : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("approvals")]
    public IEnumerable<ApprovalRequest> Approvals { get; set; } = new List<ApprovalRequest>();

    [JsonPropertyName("comments")]
    public IEnumerable<ReviewComment> Comments { get; set; } = new List<ReviewComment>();

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
