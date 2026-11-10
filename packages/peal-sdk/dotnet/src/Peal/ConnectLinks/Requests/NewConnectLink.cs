using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NewConnectLink
{
    [JsonIgnore]
    public required string WorkspaceId { get; set; }

    [JsonPropertyName("channelId")]
    public string? ChannelId { get; set; }

    [JsonPropertyName("connection")]
    public ChannelConnection? Connection { get; set; }

    [JsonPropertyName("expiresInHours")]
    public int? ExpiresInHours { get; set; }

    [JsonPropertyName("locale")]
    public ConnectLinkLocale? Locale { get; set; }

    [JsonPropertyName("platform")]
    public required Platform Platform { get; set; }

    [JsonPropertyName("returnUrl")]
    public string? ReturnUrl { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
