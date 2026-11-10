using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PlanAllowances : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("assistantRequests")]
    public long? AssistantRequests { get; set; }

    [JsonPropertyName("channels")]
    public long? Channels { get; set; }

    [JsonPropertyName("mediaStorage")]
    public long? MediaStorage { get; set; }

    [JsonPropertyName("members")]
    public long? Members { get; set; }

    [JsonPropertyName("scheduledPosts")]
    public long? ScheduledPosts { get; set; }

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
