using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ReviewLink : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("access")]
    public required ReviewLinkAccess Access { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("createdBy")]
    public string? CreatedBy { get; set; }

    [JsonPropertyName("expiresAt")]
    public required string ExpiresAt { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("postId")]
    public required string PostId { get; set; }

    [JsonPropertyName("revokedAt")]
    public string? RevokedAt { get; set; }

    [JsonPropertyName("status")]
    public required ReviewLinkStatus Status { get; set; }

    [JsonIgnore]
    public ReadOnlyAdditionalProperties AdditionalProperties { get; private set; } = new();

    void IJsonOnDeserialized.OnDeserialized() =>
        AdditionalProperties.CopyFromExtensionData(_extensionData);

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
