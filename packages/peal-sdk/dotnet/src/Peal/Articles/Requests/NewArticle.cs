using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewArticle
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("body")]
    public required ArticleBody Body { get; set; }

    [JsonPropertyName("categories")]
    public IEnumerable<string>? Categories { get; set; }

    [JsonPropertyName("coverMediaId")]
    public string? CoverMediaId { get; set; }

    [JsonPropertyName("excerpt")]
    public string? Excerpt { get; set; }

    [JsonPropertyName("siteStatus")]
    public ArticleSiteStatus? SiteStatus { get; set; }

    [JsonPropertyName("tags")]
    public IEnumerable<string>? Tags { get; set; }

    [JsonPropertyName("title")]
    public required string Title { get; set; }

    [JsonPropertyName("channelId")]
    public required string ChannelId { get; set; }

    [JsonPropertyName("schedule")]
    public ArticleTime? Schedule { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
