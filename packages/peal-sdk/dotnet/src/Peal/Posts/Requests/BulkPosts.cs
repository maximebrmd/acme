using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record BulkPosts
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("posts")]
    public IEnumerable<BulkPost> Posts { get; set; } = new List<BulkPost>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
