using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record QuoteBoostAdsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required NewBoost Body { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
