using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ListWorkspacesPartnerRequest
{
    [JsonIgnore]
    public string? Before { get; set; }

    [JsonIgnore]
    public string? ExternalId { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    [JsonIgnore]
    public string? Name { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
