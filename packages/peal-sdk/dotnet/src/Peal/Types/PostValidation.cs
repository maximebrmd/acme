using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostValidation : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("awaitsApproval")]
    public required bool AwaitsApproval { get; set; }

    [JsonPropertyName("channels")]
    public IEnumerable<ChannelPreview> Channels { get; set; } = new List<ChannelPreview>();

    [JsonPropertyName("duplicates")]
    public IEnumerable<DuplicateOnChannel> Duplicates { get; set; } =
        new List<DuplicateOnChannel>();

    [JsonPropertyName("planLimit")]
    public PlanShortfall? PlanLimit { get; set; }

    [JsonPropertyName("schedule")]
    public ScheduleCheck? Schedule { get; set; }

    [JsonPropertyName("unknownChannels")]
    public IEnumerable<string> UnknownChannels { get; set; } = new List<string>();

    [JsonPropertyName("unknownMedia")]
    public IEnumerable<string> UnknownMedia { get; set; } = new List<string>();

    [JsonPropertyName("valid")]
    public required bool Valid { get; set; }

    [JsonPropertyName("violations")]
    public IEnumerable<ContentViolation> Violations { get; set; } = new List<ContentViolation>();

    [JsonPropertyName("warnings")]
    public IEnumerable<PostWarning>? Warnings { get; set; }

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
