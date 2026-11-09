using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ChooseAccounts
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required Platform Platform { get; set; }

    [JsonPropertyName("accountIds")]
    public IEnumerable<string> AccountIds { get; set; } = new List<string>();

    [JsonPropertyName("selection")]
    public required string Selection { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
