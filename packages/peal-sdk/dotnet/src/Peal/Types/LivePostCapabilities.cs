using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record LivePostCapabilities : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("edit")]
    public required bool Edit { get; set; }

    [JsonPropertyName("editBlockedBy")]
    public LivePostBlocker? EditBlockedBy { get; set; }

    [JsonPropertyName("unpublish")]
    public required bool Unpublish { get; set; }

    [JsonPropertyName("unpublishBlockedBy")]
    public LivePostBlocker? UnpublishBlockedBy { get; set; }

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
