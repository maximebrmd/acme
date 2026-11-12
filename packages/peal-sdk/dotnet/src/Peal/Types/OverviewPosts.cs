using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record OverviewPosts : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("awaitingApproval")]
    public required int AwaitingApproval { get; set; }

    [JsonPropertyName("failedLast7Days")]
    public required int FailedLast7Days { get; set; }

    [JsonPropertyName("mayApprove")]
    public required bool MayApprove { get; set; }

    [JsonPropertyName("scheduledNext7Days")]
    public required int ScheduledNext7Days { get; set; }

    [JsonPropertyName("unconfirmedLast7Days")]
    public required int UnconfirmedLast7Days { get; set; }

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
