using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NoticeEventAdBoostChanged : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("boostId")]
    public required string BoostId { get; set; }

    [JsonPropertyName("budget")]
    public required Money Budget { get; set; }

    [JsonPropertyName("budgetDigits")]
    public required double BudgetDigits { get; set; }

    [JsonPropertyName("change")]
    public required NoticeEventAdBoostChangedChange Change { get; set; }

    [JsonPropertyName("endsAt")]
    public required string EndsAt { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

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
