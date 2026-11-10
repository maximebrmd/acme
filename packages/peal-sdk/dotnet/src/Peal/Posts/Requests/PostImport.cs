using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record PostImport
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? IdempotencyKey { get; set; }

    [JsonPropertyName("csv")]
    public required string Csv { get; set; }

    [JsonPropertyName("dryRun")]
    public bool? DryRun { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
