using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxThreadDetail : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("abilities")]
    public required InboxAbilities Abilities { get; set; }

    [JsonPropertyName("comments")]
    public IEnumerable<InboxComment> Comments { get; set; } = new List<InboxComment>();

    [JsonPropertyName("platform")]
    public Platform? Platform { get; set; }

    [JsonPropertyName("replies")]
    public IEnumerable<InboxReply> Replies { get; set; } = new List<InboxReply>();

    [JsonPropertyName("thread")]
    public required InboxThread Thread { get; set; }

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
