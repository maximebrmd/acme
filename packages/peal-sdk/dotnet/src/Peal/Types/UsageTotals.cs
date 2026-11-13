using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record UsageTotals : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("billableAccountDays")]
    public long? BillableAccountDays { get; set; }

    [JsonPropertyName("byPlatform")]
    public IEnumerable<PlatformPosts> ByPlatform { get; set; } = new List<PlatformPosts>();

    [JsonPropertyName("channelDays")]
    public required long ChannelDays { get; set; }

    [JsonPropertyName("daysCounted")]
    public required int DaysCounted { get; set; }

    [JsonPropertyName("meteredPosts")]
    public IEnumerable<MeteredPosts> MeteredPosts { get; set; } = new List<MeteredPosts>();

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
