using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record QueueReshuffle : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("moved")]
    public required int Moved { get; set; }

    [JsonPropertyName("remaining")]
    public required int Remaining { get; set; }

    [JsonPropertyName("stoppedBy")]
    public ReshuffleStop? StoppedBy { get; set; }

    [JsonPropertyName("unchanged")]
    public required int Unchanged { get; set; }

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
