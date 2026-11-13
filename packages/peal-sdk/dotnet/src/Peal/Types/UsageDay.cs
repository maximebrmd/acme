using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record UsageDay : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("assistantRequests")]
    public int? AssistantRequests { get; set; }

    [JsonPropertyName("billableAccounts")]
    public int? BillableAccounts { get; set; }

    [JsonPropertyName("byPlatform")]
    public IEnumerable<PlatformPosts> ByPlatform { get; set; } = new List<PlatformPosts>();

    [JsonPropertyName("channels")]
    public int? Channels { get; set; }

    [JsonPropertyName("day")]
    public required string Day { get; set; }

    [JsonPropertyName("mediaStorage")]
    public long? MediaStorage { get; set; }

    [JsonPropertyName("members")]
    public int? Members { get; set; }

    [JsonPropertyName("publishedPosts")]
    public required int PublishedPosts { get; set; }

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
