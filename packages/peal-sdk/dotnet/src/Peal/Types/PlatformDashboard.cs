using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PlatformDashboard : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("followers")]
    public required FollowerChange Followers { get; set; }

    [JsonPropertyName("previousFollowers")]
    public required FollowerChange PreviousFollowers { get; set; }

    [JsonPropertyName("previousTotals")]
    public required DashboardTotals PreviousTotals { get; set; }

    [JsonPropertyName("totals")]
    public required DashboardTotals Totals { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

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
