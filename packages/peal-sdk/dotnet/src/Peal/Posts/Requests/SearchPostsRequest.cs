using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record SearchPostsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? AuthorId { get; set; }

    [JsonIgnore]
    public string? ChannelId { get; set; }

    [JsonIgnore]
    public PostOriginVia? CreatedVia { get; set; }

    [JsonIgnore]
    public string? Cursor { get; set; }

    [JsonIgnore]
    public string? From { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    [JsonIgnore]
    public PostOutcome? Outcome { get; set; }

    [JsonIgnore]
    public Platform? Platform { get; set; }

    [JsonIgnore]
    public PostSort? Sort { get; set; }

    [JsonIgnore]
    public PostStatus? Status { get; set; }

    [JsonIgnore]
    public string? To { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
