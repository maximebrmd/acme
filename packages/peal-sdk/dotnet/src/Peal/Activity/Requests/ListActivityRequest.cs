using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ListActivityRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? Actor { get; set; }

    [JsonIgnore]
    public string? Cursor { get; set; }

    [JsonIgnore]
    public string? Limit { get; set; }

    [JsonIgnore]
    public string? Operation { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
