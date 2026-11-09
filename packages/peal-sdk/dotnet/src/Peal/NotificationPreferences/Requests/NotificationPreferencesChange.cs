using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[Serializable]
public record NotificationPreferencesChange
{
    [JsonPropertyName("email")]
    public NotificationPreferencesChangeEmail? Email { get; set; }

    [JsonPropertyName("everyPost")]
    public bool? EveryPost { get; set; }

    /// <inheritdoc />
    public override string ToString()
    {
        return JsonUtils.Serialize(this);
    }
}
