using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PollCapabilities : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("choiceLimit")]
    public required TextLimit ChoiceLimit { get; set; }

    [JsonPropertyName("durationMinutes")]
    public PollCapabilitiesDurationMinutes? DurationMinutes { get; set; }

    [JsonPropertyName("maxChoices")]
    public required int MaxChoices { get; set; }

    [JsonPropertyName("minChoices")]
    public required int MinChoices { get; set; }

    [JsonPropertyName("multipleChoice")]
    public required bool MultipleChoice { get; set; }

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
