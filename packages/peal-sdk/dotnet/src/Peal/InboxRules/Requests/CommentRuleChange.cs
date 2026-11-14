using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record CommentRuleChange
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string RuleId { get; set; }

    [JsonPropertyName("keywords")]
    public IEnumerable<string>? Keywords { get; set; }

    [JsonPropertyName("paused")]
    public bool? Paused { get; set; }

    [JsonPropertyName("reply")]
    public string? Reply { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
