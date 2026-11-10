using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record ConnectLink : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("channelId")]
    public string? ChannelId { get; set; }

    [JsonPropertyName("channelIds")]
    public IEnumerable<string> ChannelIds { get; set; } = new List<string>();

    [JsonPropertyName("completedAt")]
    public string? CompletedAt { get; set; }

    [JsonPropertyName("createdAt")]
    public required string CreatedAt { get; set; }

    [JsonPropertyName("expiresAt")]
    public required string ExpiresAt { get; set; }

    [JsonPropertyName("failedAt")]
    public string? FailedAt { get; set; }

    [JsonPropertyName("failure")]
    public HostedConnectFailure? Failure { get; set; }

    [JsonPropertyName("id")]
    public required string Id { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

    [JsonPropertyName("returnUrl")]
    public string? ReturnUrl { get; set; }

    [JsonPropertyName("status")]
    public required ConnectLinkStatus Status { get; set; }

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
