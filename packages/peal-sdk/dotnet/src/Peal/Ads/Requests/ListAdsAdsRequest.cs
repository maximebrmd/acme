using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ListAdsAdsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required string AccountId { get; set; }

    [JsonIgnore]
    public string? From { get; set; }

    [JsonIgnore]
    public string? To { get; set; }

    [JsonIgnore]
    public string? CampaignId { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
