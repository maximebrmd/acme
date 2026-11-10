using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record CreateSignaturesRequest
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonIgnore]
    public required SignatureDetails Body { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
