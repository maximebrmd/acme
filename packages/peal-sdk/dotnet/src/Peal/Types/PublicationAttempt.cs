using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PublicationAttempt : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("attempt")]
    public required int Attempt { get; set; }

    [JsonPropertyName("finishedAt")]
    public required string FinishedAt { get; set; }

    [JsonPropertyName("part")]
    public required int Part { get; set; }

    [JsonPropertyName("refusalCode")]
    public string? RefusalCode { get; set; }

    [JsonPropertyName("result")]
    public required AttemptResult Result { get; set; }

    [JsonPropertyName("retryAt")]
    public string? RetryAt { get; set; }

    [JsonPropertyName("round")]
    public required int Round { get; set; }

    [JsonPropertyName("startedAt")]
    public required string StartedAt { get; set; }

    [JsonPropertyName("targetId")]
    public required string TargetId { get; set; }

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
