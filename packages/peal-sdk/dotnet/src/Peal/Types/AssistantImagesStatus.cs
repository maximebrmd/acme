using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AssistantImagesStatus : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("aspects")]
    public IEnumerable<ImageAspect> Aspects { get; set; } = new List<ImageAspect>();

    [JsonPropertyName("available")]
    public required bool Available { get; set; }

    [JsonPropertyName("maxPromptLength")]
    public required int MaxPromptLength { get; set; }

    [JsonPropertyName("requestCost")]
    public required int RequestCost { get; set; }

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
