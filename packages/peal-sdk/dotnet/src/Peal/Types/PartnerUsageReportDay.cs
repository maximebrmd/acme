using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PartnerUsageReportDay : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("byPlatform")]
    public IEnumerable<PlatformPosts> ByPlatform { get; set; } = new List<PlatformPosts>();

    [JsonPropertyName("channels")]
    public int? Channels { get; set; }

    [JsonPropertyName("day")]
    public required string Day { get; set; }

    [JsonPropertyName("publishedPosts")]
    public required int PublishedPosts { get; set; }

    [JsonPropertyName("workspaces")]
    public int? Workspaces { get; set; }

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
