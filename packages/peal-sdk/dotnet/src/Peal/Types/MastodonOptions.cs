using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on a Mastodon account, on every part of a thread. Scheduling needs none of them; a content warning counts in the text's limit.
/// </summary>
[Serializable]
public record MastodonOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("contentWarning")]
    public string? ContentWarning { get; set; }

    [JsonPropertyName("language")]
    public string? Language { get; set; }

    [JsonPropertyName("quotePolicy")]
    public MastodonQuotePolicy? QuotePolicy { get; set; }

    [JsonPropertyName("sensitive")]
    public bool? Sensitive { get; set; }

    [JsonPropertyName("visibility")]
    public MastodonVisibility? Visibility { get; set; }

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
