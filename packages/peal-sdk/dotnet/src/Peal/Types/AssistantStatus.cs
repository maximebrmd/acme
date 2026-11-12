using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AssistantStatus : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("available")]
    public required bool Available { get; set; }

    [JsonPropertyName("dailyLimit")]
    public required int DailyLimit { get; set; }

    [JsonPropertyName("images")]
    public required AssistantImagesStatus Images { get; set; }

    [JsonPropertyName("maxTextLength")]
    public required int MaxTextLength { get; set; }

    [JsonPropertyName("remaining")]
    public required int Remaining { get; set; }

    [JsonPropertyName("resetsAt")]
    public required string ResetsAt { get; set; }

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
