using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using OneOf;
using Peal.Core;

namespace Peal;

[Serializable]
public record BestTimesHour : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("hour")]
    public required int Hour { get; set; }

    [JsonPropertyName("median")]
    public OneOf<double, NonFiniteNumber>? Median { get; set; }

    [JsonPropertyName("posts")]
    public required int Posts { get; set; }

    [JsonPropertyName("weekday")]
    public required Weekday Weekday { get; set; }

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
