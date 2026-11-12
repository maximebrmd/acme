using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record AgendaOverviewRequest
{
    [JsonIgnore]
    public string? Cursor { get; set; }

    [JsonIgnore]
    public required string From { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    [JsonIgnore]
    public required string To { get; set; }

    [JsonIgnore]
    public string? WorkspaceIds { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
