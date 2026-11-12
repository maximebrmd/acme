using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ReportExportOverviewRequest
{
    [JsonIgnore]
    public string? Days { get; set; }

    [JsonIgnore]
    public required string TimeZone { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
