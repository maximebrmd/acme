using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostAdPerformance : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("boosts")]
    public IEnumerable<Boost> Boosts { get; set; } = new List<Boost>();

    [JsonPropertyName("organic")]
    public IEnumerable<OrganicCounts> Organic { get; set; } = new List<OrganicCounts>();

    [JsonPropertyName("paid")]
    public IEnumerable<PostAdPerformancePaidItem> Paid { get; set; } =
        new List<PostAdPerformancePaidItem>();

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
