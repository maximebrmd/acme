using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ConnectSite
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("address")]
    public required string Address { get; set; }

    [JsonPropertyName("applicationPassword")]
    public required string ApplicationPassword { get; set; }

    [JsonPropertyName("platform")]
    public required SitePlatform Platform { get; set; }

    [JsonPropertyName("userName")]
    public required string UserName { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
