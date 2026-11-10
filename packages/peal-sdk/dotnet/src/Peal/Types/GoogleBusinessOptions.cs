using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a Google Business Profile location. An `event` or an `offer` needs `title`, `startsAt` and `endsAt`, on the location's own clock; only an `offer` takes `couponCode`, `redeemUrl` and `terms`.
/// </summary>
[Serializable]
public record GoogleBusinessOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("callToAction")]
    public GoogleBusinessCallToAction? CallToAction { get; set; }

    [JsonPropertyName("callToActionUrl")]
    public string? CallToActionUrl { get; set; }

    [JsonPropertyName("couponCode")]
    public string? CouponCode { get; set; }

    [JsonPropertyName("endsAt")]
    public string? EndsAt { get; set; }

    [JsonPropertyName("postType")]
    public GoogleBusinessPostType? PostType { get; set; }

    [JsonPropertyName("redeemUrl")]
    public string? RedeemUrl { get; set; }

    [JsonPropertyName("startsAt")]
    public string? StartsAt { get; set; }

    [JsonPropertyName("terms")]
    public string? Terms { get; set; }

    [JsonPropertyName("title")]
    public string? Title { get; set; }

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
