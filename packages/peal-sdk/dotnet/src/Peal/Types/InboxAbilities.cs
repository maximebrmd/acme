using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record InboxAbilities : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("delete")]
    public required InboxAbilityStanding Delete { get; set; }

    [JsonPropertyName("hide")]
    public required InboxAbilityStanding Hide { get; set; }

    [JsonPropertyName("like")]
    public required InboxAbilityStanding Like { get; set; }

    [JsonPropertyName("read")]
    public required InboxAbilityStanding Read { get; set; }

    [JsonPropertyName("reply")]
    public required InboxAbilityStanding Reply { get; set; }

    [JsonPropertyName("withdraw")]
    public required InboxAbilityStanding Withdraw { get; set; }

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
