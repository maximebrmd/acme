using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewReviewLink
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string PostId { get; set; }

    [JsonPropertyName("access")]
    public required ReviewLinkAccess Access { get; set; }

    [JsonPropertyName("expiresInHours")]
    public int? ExpiresInHours { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
