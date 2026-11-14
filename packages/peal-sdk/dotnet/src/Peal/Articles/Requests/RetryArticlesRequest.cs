using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record RetryArticlesRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string ArticleId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
