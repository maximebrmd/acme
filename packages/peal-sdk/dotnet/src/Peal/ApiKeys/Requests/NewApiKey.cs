using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewApiKey
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("expiresInDays")]
    public int? ExpiresInDays { get; set; }

    [JsonPropertyName("name")]
    public required string Name { get; set; }

    [JsonPropertyName("permissions")]
    public IEnumerable<Permission> Permissions { get; set; } = new List<Permission>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
