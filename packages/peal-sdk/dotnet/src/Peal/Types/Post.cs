using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record Post : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("authorId")]
    public string? AuthorId { get; set; }

    [JsonPropertyName("content")]
    public required PostContent Content { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("outcome")]
    public PostOutcome? Outcome { get; set; }

    [JsonPropertyName("schedule")]
    public PostSchedule? Schedule { get; set; }

    [JsonPropertyName("status")]
    public required PostStatus Status { get; set; }

    [JsonPropertyName("targets")]
    public IEnumerable<PostTarget> Targets { get; set; } = new List<PostTarget>();

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
