using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// How a post goes out on an Instagram account. Scheduling needs none of them; `format` `story` makes it a story, sent without the post's text and taking none of the other options; `shareToFeed`, `coverMediaId`, `thumbOffsetMs`, `audioName` and `trialReel` are for a post of one video (a reel), and each of `collaborators` receives an invitation.
/// </summary>
[Serializable]
public record InstagramOptions : IJsonOnDeserialized
{
    [JsonExtensionData]
    private readonly IDictionary<string, JsonElement> _extensionData =
        new Dictionary<string, JsonElement>();

    [JsonPropertyName("audioName")]
    public string? AudioName { get; set; }

    [JsonPropertyName("collaborators")]
    public IEnumerable<string>? Collaborators { get; set; }

    [JsonPropertyName("coverMediaId")]
    public string? CoverMediaId { get; set; }

    [JsonPropertyName("format")]
    public InstagramFormat? Format { get; set; }

    [JsonPropertyName("shareToFeed")]
    public bool? ShareToFeed { get; set; }

    [JsonPropertyName("thumbOffsetMs")]
    public int? ThumbOffsetMs { get; set; }

    [JsonPropertyName("trialReel")]
    public InstagramTrialReel? TrialReel { get; set; }

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
