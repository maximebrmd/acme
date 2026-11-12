using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record OverviewPartnerRequest
{
    [JsonIgnore]
    public string? Before { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
