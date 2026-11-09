using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record TikTokCreator : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("avatarUrl")]
    public string? AvatarUrl { get; set; }

    [JsonPropertyName("commentDisabled")]
    public required bool CommentDisabled { get; set; }

    [JsonPropertyName("duetDisabled")]
    public required bool DuetDisabled { get; set; }

    [JsonPropertyName("maxVideoDurationMs")]
    public int? MaxVideoDurationMs { get; set; }

    [JsonPropertyName("nickname")]
    public required string Nickname { get; set; }

    [JsonPropertyName("privacyLevels")]
    public IEnumerable<TikTokPrivacyLevel> PrivacyLevels { get; set; } =
        new List<TikTokPrivacyLevel>();

    [JsonPropertyName("stitchDisabled")]
    public required bool StitchDisabled { get; set; }

    [JsonPropertyName("username")]
    public required string Username { get; set; }

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
