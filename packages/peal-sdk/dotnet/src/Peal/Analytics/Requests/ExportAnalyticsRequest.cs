using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ExportAnalyticsRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public string? Days { get; set; }

    [JsonIgnore]
    public string? From { get; set; }

    [JsonIgnore]
    public required string TimeZone { get; set; }

    [JsonIgnore]
    public string? To { get; set; }

    [JsonIgnore]
    public AnalyticsExportFormat? Format { get; set; }

    [JsonIgnore]
    public required AnalyticsExportKind Kind { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
