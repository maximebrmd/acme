using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record MarkNoticesRead
{
    [JsonPropertyName("ids")]
    public IEnumerable<string> Ids { get; set; } = new List<string>();

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
