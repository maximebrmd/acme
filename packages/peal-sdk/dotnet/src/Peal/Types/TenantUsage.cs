using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record TenantUsage : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("assistantRequests")]
    public required int AssistantRequests { get; set; }

    [JsonPropertyName("byPlatform")]
    public IEnumerable<PlatformPosts> ByPlatform { get; set; } = new List<PlatformPosts>();

    [JsonPropertyName("channelDays")]
    public required long ChannelDays { get; set; }

    [JsonPropertyName("channels")]
    public required int Channels { get; set; }

    [JsonPropertyName("daysCounted")]
    public required int DaysCounted { get; set; }

    [JsonPropertyName("externalId")]
    public string? ExternalId { get; set; }

    [JsonPropertyName("home")]
    public required bool Home { get; set; }

    [JsonPropertyName("mediaStorage")]
    public long? MediaStorage { get; set; }

    [JsonPropertyName("meteredPosts")]
    public IEnumerable<MeteredPosts> MeteredPosts { get; set; } = new List<MeteredPosts>();

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("publishedPosts")]
    public required int PublishedPosts { get; set; }

    [JsonPropertyName("workspaceId")]
    public required string WorkspaceId { get; set; }

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
