using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RecyclingRuleChange
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string RuleId { get; set; }

    [JsonPropertyName("count")]
    public int? Count { get; set; }

    [JsonPropertyName("paused")]
    public bool? Paused { get; set; }

    [JsonPropertyName("until")]
    public string? Until { get; set; }

    [JsonPropertyName("variants")]
    public IEnumerable<RecyclingVariant>? Variants { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
