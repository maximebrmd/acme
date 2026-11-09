// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ContentViolation.JsonConverter))]
[Serializable]
public record ContentViolation
{
    internal ContentViolation(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.NoChannels"/>.
    /// </summary>
    public ContentViolation(ContentViolation.NoChannels value)
    {
        Type = "noChannels";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.OverrideWithoutChannel"/>.
    /// </summary>
    public ContentViolation(ContentViolation.OverrideWithoutChannel value)
    {
        Type = "overrideWithoutChannel";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.OptionsWithoutChannel"/>.
    /// </summary>
    public ContentViolation(ContentViolation.OptionsWithoutChannel value)
    {
        Type = "optionsWithoutChannel";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.OptionsForOtherPlatform"/>.
    /// </summary>
    public ContentViolation(ContentViolation.OptionsForOtherPlatform value)
    {
        Type = "optionsForOtherPlatform";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.OptionMissing"/>.
    /// </summary>
    public ContentViolation(ContentViolation.OptionMissing value)
    {
        Type = "optionMissing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.OptionTooLong"/>.
    /// </summary>
    public ContentViolation(ContentViolation.OptionTooLong value)
    {
        Type = "optionTooLong";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.OptionInvalid"/>.
    /// </summary>
    public ContentViolation(ContentViolation.OptionInvalid value)
    {
        Type = "optionInvalid";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.Empty"/>.
    /// </summary>
    public ContentViolation(ContentViolation.Empty value)
    {
        Type = "empty";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TextTooLong"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TextTooLong value)
    {
        Type = "textTooLong";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.ForbiddenCharacters"/>.
    /// </summary>
    public ContentViolation(ContentViolation.ForbiddenCharacters value)
    {
        Type = "forbiddenCharacters";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TooManyMedia"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TooManyMedia value)
    {
        Type = "tooManyMedia";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.MediaRequired"/>.
    /// </summary>
    public ContentViolation(ContentViolation.MediaRequired value)
    {
        Type = "mediaRequired";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TooManyHashtags"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TooManyHashtags value)
    {
        Type = "tooManyHashtags";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TooManyMentions"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TooManyMentions value)
    {
        Type = "tooManyMentions";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TooManyLinks"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TooManyLinks value)
    {
        Type = "tooManyLinks";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TooManyVideos"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TooManyVideos value)
    {
        Type = "tooManyVideos";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.MixedMedia"/>.
    /// </summary>
    public ContentViolation(ContentViolation.MixedMedia value)
    {
        Type = "mixedMedia";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.MediaTypeUnsupported"/>.
    /// </summary>
    public ContentViolation(ContentViolation.MediaTypeUnsupported value)
    {
        Type = "mediaTypeUnsupported";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.MediaTooLarge"/>.
    /// </summary>
    public ContentViolation(ContentViolation.MediaTooLarge value)
    {
        Type = "mediaTooLarge";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.MediaTooSmall"/>.
    /// </summary>
    public ContentViolation(ContentViolation.MediaTooSmall value)
    {
        Type = "mediaTooSmall";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.VideoTooLong"/>.
    /// </summary>
    public ContentViolation(ContentViolation.VideoTooLong value)
    {
        Type = "videoTooLong";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.VideoTooShort"/>.
    /// </summary>
    public ContentViolation(ContentViolation.VideoTooShort value)
    {
        Type = "videoTooShort";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.TooManyPixels"/>.
    /// </summary>
    public ContentViolation(ContentViolation.TooManyPixels value)
    {
        Type = "tooManyPixels";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.SideOutOfRange"/>.
    /// </summary>
    public ContentViolation(ContentViolation.SideOutOfRange value)
    {
        Type = "sideOutOfRange";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.AspectRatioUnsupported"/>.
    /// </summary>
    public ContentViolation(ContentViolation.AspectRatioUnsupported value)
    {
        Type = "aspectRatioUnsupported";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ContentViolation with <see cref="ContentViolation.AltTextTooLong"/>.
    /// </summary>
    public ContentViolation(ContentViolation.AltTextTooLong value)
    {
        Type = "altTextTooLong";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("_tag")]
    public string Type { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Type"/> is "noChannels"
    /// </summary>
    public bool IsNoChannels => Type == "noChannels";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "overrideWithoutChannel"
    /// </summary>
    public bool IsOverrideWithoutChannel => Type == "overrideWithoutChannel";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "optionsWithoutChannel"
    /// </summary>
    public bool IsOptionsWithoutChannel => Type == "optionsWithoutChannel";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "optionsForOtherPlatform"
    /// </summary>
    public bool IsOptionsForOtherPlatform => Type == "optionsForOtherPlatform";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "optionMissing"
    /// </summary>
    public bool IsOptionMissing => Type == "optionMissing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "optionTooLong"
    /// </summary>
    public bool IsOptionTooLong => Type == "optionTooLong";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "optionInvalid"
    /// </summary>
    public bool IsOptionInvalid => Type == "optionInvalid";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "empty"
    /// </summary>
    public bool IsEmpty => Type == "empty";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "textTooLong"
    /// </summary>
    public bool IsTextTooLong => Type == "textTooLong";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "forbiddenCharacters"
    /// </summary>
    public bool IsForbiddenCharacters => Type == "forbiddenCharacters";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyMedia"
    /// </summary>
    public bool IsTooManyMedia => Type == "tooManyMedia";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "mediaRequired"
    /// </summary>
    public bool IsMediaRequired => Type == "mediaRequired";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyHashtags"
    /// </summary>
    public bool IsTooManyHashtags => Type == "tooManyHashtags";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyMentions"
    /// </summary>
    public bool IsTooManyMentions => Type == "tooManyMentions";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyLinks"
    /// </summary>
    public bool IsTooManyLinks => Type == "tooManyLinks";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyVideos"
    /// </summary>
    public bool IsTooManyVideos => Type == "tooManyVideos";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "mixedMedia"
    /// </summary>
    public bool IsMixedMedia => Type == "mixedMedia";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "mediaTypeUnsupported"
    /// </summary>
    public bool IsMediaTypeUnsupported => Type == "mediaTypeUnsupported";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "mediaTooLarge"
    /// </summary>
    public bool IsMediaTooLarge => Type == "mediaTooLarge";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "mediaTooSmall"
    /// </summary>
    public bool IsMediaTooSmall => Type == "mediaTooSmall";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "videoTooLong"
    /// </summary>
    public bool IsVideoTooLong => Type == "videoTooLong";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "videoTooShort"
    /// </summary>
    public bool IsVideoTooShort => Type == "videoTooShort";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyPixels"
    /// </summary>
    public bool IsTooManyPixels => Type == "tooManyPixels";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "sideOutOfRange"
    /// </summary>
    public bool IsSideOutOfRange => Type == "sideOutOfRange";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "aspectRatioUnsupported"
    /// </summary>
    public bool IsAspectRatioUnsupported => Type == "aspectRatioUnsupported";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "altTextTooLong"
    /// </summary>
    public bool IsAltTextTooLong => Type == "altTextTooLong";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationNoChannels"/> if <see cref="Type"/> is 'noChannels', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'noChannels'.</exception>
    public Peal.ContentViolationNoChannels AsNoChannels() =>
        IsNoChannels
            ? (Peal.ContentViolationNoChannels)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'noChannels'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationOverrideWithoutChannel"/> if <see cref="Type"/> is 'overrideWithoutChannel', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'overrideWithoutChannel'.</exception>
    public Peal.ContentViolationOverrideWithoutChannel AsOverrideWithoutChannel() =>
        IsOverrideWithoutChannel
            ? (Peal.ContentViolationOverrideWithoutChannel)Value!
            : throw new global::System.Exception(
                "ContentViolation.Type is not 'overrideWithoutChannel'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationOptionsWithoutChannel"/> if <see cref="Type"/> is 'optionsWithoutChannel', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionsWithoutChannel'.</exception>
    public Peal.ContentViolationOptionsWithoutChannel AsOptionsWithoutChannel() =>
        IsOptionsWithoutChannel
            ? (Peal.ContentViolationOptionsWithoutChannel)Value!
            : throw new global::System.Exception(
                "ContentViolation.Type is not 'optionsWithoutChannel'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationOptionsForOtherPlatform"/> if <see cref="Type"/> is 'optionsForOtherPlatform', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionsForOtherPlatform'.</exception>
    public Peal.ContentViolationOptionsForOtherPlatform AsOptionsForOtherPlatform() =>
        IsOptionsForOtherPlatform
            ? (Peal.ContentViolationOptionsForOtherPlatform)Value!
            : throw new global::System.Exception(
                "ContentViolation.Type is not 'optionsForOtherPlatform'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationOptionMissing"/> if <see cref="Type"/> is 'optionMissing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionMissing'.</exception>
    public Peal.ContentViolationOptionMissing AsOptionMissing() =>
        IsOptionMissing
            ? (Peal.ContentViolationOptionMissing)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'optionMissing'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationOptionTooLong"/> if <see cref="Type"/> is 'optionTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionTooLong'.</exception>
    public Peal.ContentViolationOptionTooLong AsOptionTooLong() =>
        IsOptionTooLong
            ? (Peal.ContentViolationOptionTooLong)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'optionTooLong'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationOptionInvalid"/> if <see cref="Type"/> is 'optionInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionInvalid'.</exception>
    public Peal.ContentViolationOptionInvalid AsOptionInvalid() =>
        IsOptionInvalid
            ? (Peal.ContentViolationOptionInvalid)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'optionInvalid'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationEmpty"/> if <see cref="Type"/> is 'empty', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'empty'.</exception>
    public Peal.ContentViolationEmpty AsEmpty() =>
        IsEmpty
            ? (Peal.ContentViolationEmpty)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'empty'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTextTooLong"/> if <see cref="Type"/> is 'textTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'textTooLong'.</exception>
    public Peal.ContentViolationTextTooLong AsTextTooLong() =>
        IsTextTooLong
            ? (Peal.ContentViolationTextTooLong)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'textTooLong'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationForbiddenCharacters"/> if <see cref="Type"/> is 'forbiddenCharacters', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'forbiddenCharacters'.</exception>
    public Peal.ContentViolationForbiddenCharacters AsForbiddenCharacters() =>
        IsForbiddenCharacters
            ? (Peal.ContentViolationForbiddenCharacters)Value!
            : throw new global::System.Exception(
                "ContentViolation.Type is not 'forbiddenCharacters'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTooManyMedia"/> if <see cref="Type"/> is 'tooManyMedia', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyMedia'.</exception>
    public Peal.ContentViolationTooManyMedia AsTooManyMedia() =>
        IsTooManyMedia
            ? (Peal.ContentViolationTooManyMedia)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'tooManyMedia'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationMediaRequired"/> if <see cref="Type"/> is 'mediaRequired', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'mediaRequired'.</exception>
    public Peal.ContentViolationMediaRequired AsMediaRequired() =>
        IsMediaRequired
            ? (Peal.ContentViolationMediaRequired)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'mediaRequired'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTooManyHashtags"/> if <see cref="Type"/> is 'tooManyHashtags', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyHashtags'.</exception>
    public Peal.ContentViolationTooManyHashtags AsTooManyHashtags() =>
        IsTooManyHashtags
            ? (Peal.ContentViolationTooManyHashtags)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'tooManyHashtags'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTooManyMentions"/> if <see cref="Type"/> is 'tooManyMentions', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyMentions'.</exception>
    public Peal.ContentViolationTooManyMentions AsTooManyMentions() =>
        IsTooManyMentions
            ? (Peal.ContentViolationTooManyMentions)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'tooManyMentions'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTooManyLinks"/> if <see cref="Type"/> is 'tooManyLinks', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyLinks'.</exception>
    public Peal.ContentViolationTooManyLinks AsTooManyLinks() =>
        IsTooManyLinks
            ? (Peal.ContentViolationTooManyLinks)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'tooManyLinks'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTooManyVideos"/> if <see cref="Type"/> is 'tooManyVideos', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyVideos'.</exception>
    public Peal.ContentViolationTooManyVideos AsTooManyVideos() =>
        IsTooManyVideos
            ? (Peal.ContentViolationTooManyVideos)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'tooManyVideos'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationMixedMedia"/> if <see cref="Type"/> is 'mixedMedia', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'mixedMedia'.</exception>
    public Peal.ContentViolationMixedMedia AsMixedMedia() =>
        IsMixedMedia
            ? (Peal.ContentViolationMixedMedia)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'mixedMedia'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationMediaTypeUnsupported"/> if <see cref="Type"/> is 'mediaTypeUnsupported', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'mediaTypeUnsupported'.</exception>
    public Peal.ContentViolationMediaTypeUnsupported AsMediaTypeUnsupported() =>
        IsMediaTypeUnsupported
            ? (Peal.ContentViolationMediaTypeUnsupported)Value!
            : throw new global::System.Exception(
                "ContentViolation.Type is not 'mediaTypeUnsupported'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationMediaTooLarge"/> if <see cref="Type"/> is 'mediaTooLarge', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'mediaTooLarge'.</exception>
    public Peal.ContentViolationMediaTooLarge AsMediaTooLarge() =>
        IsMediaTooLarge
            ? (Peal.ContentViolationMediaTooLarge)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'mediaTooLarge'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationMediaTooSmall"/> if <see cref="Type"/> is 'mediaTooSmall', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'mediaTooSmall'.</exception>
    public Peal.ContentViolationMediaTooSmall AsMediaTooSmall() =>
        IsMediaTooSmall
            ? (Peal.ContentViolationMediaTooSmall)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'mediaTooSmall'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationVideoTooLong"/> if <see cref="Type"/> is 'videoTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'videoTooLong'.</exception>
    public Peal.ContentViolationVideoTooLong AsVideoTooLong() =>
        IsVideoTooLong
            ? (Peal.ContentViolationVideoTooLong)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'videoTooLong'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationVideoTooShort"/> if <see cref="Type"/> is 'videoTooShort', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'videoTooShort'.</exception>
    public Peal.ContentViolationVideoTooShort AsVideoTooShort() =>
        IsVideoTooShort
            ? (Peal.ContentViolationVideoTooShort)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'videoTooShort'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationTooManyPixels"/> if <see cref="Type"/> is 'tooManyPixels', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyPixels'.</exception>
    public Peal.ContentViolationTooManyPixels AsTooManyPixels() =>
        IsTooManyPixels
            ? (Peal.ContentViolationTooManyPixels)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'tooManyPixels'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationSideOutOfRange"/> if <see cref="Type"/> is 'sideOutOfRange', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'sideOutOfRange'.</exception>
    public Peal.ContentViolationSideOutOfRange AsSideOutOfRange() =>
        IsSideOutOfRange
            ? (Peal.ContentViolationSideOutOfRange)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'sideOutOfRange'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationAspectRatioUnsupported"/> if <see cref="Type"/> is 'aspectRatioUnsupported', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'aspectRatioUnsupported'.</exception>
    public Peal.ContentViolationAspectRatioUnsupported AsAspectRatioUnsupported() =>
        IsAspectRatioUnsupported
            ? (Peal.ContentViolationAspectRatioUnsupported)Value!
            : throw new global::System.Exception(
                "ContentViolation.Type is not 'aspectRatioUnsupported'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ContentViolationAltTextTooLong"/> if <see cref="Type"/> is 'altTextTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'altTextTooLong'.</exception>
    public Peal.ContentViolationAltTextTooLong AsAltTextTooLong() =>
        IsAltTextTooLong
            ? (Peal.ContentViolationAltTextTooLong)Value!
            : throw new global::System.Exception("ContentViolation.Type is not 'altTextTooLong'");

    public T Match<T>(
        Func<Peal.ContentViolationNoChannels, T> onNoChannels,
        Func<Peal.ContentViolationOverrideWithoutChannel, T> onOverrideWithoutChannel,
        Func<Peal.ContentViolationOptionsWithoutChannel, T> onOptionsWithoutChannel,
        Func<Peal.ContentViolationOptionsForOtherPlatform, T> onOptionsForOtherPlatform,
        Func<Peal.ContentViolationOptionMissing, T> onOptionMissing,
        Func<Peal.ContentViolationOptionTooLong, T> onOptionTooLong,
        Func<Peal.ContentViolationOptionInvalid, T> onOptionInvalid,
        Func<Peal.ContentViolationEmpty, T> onEmpty,
        Func<Peal.ContentViolationTextTooLong, T> onTextTooLong,
        Func<Peal.ContentViolationForbiddenCharacters, T> onForbiddenCharacters,
        Func<Peal.ContentViolationTooManyMedia, T> onTooManyMedia,
        Func<Peal.ContentViolationMediaRequired, T> onMediaRequired,
        Func<Peal.ContentViolationTooManyHashtags, T> onTooManyHashtags,
        Func<Peal.ContentViolationTooManyMentions, T> onTooManyMentions,
        Func<Peal.ContentViolationTooManyLinks, T> onTooManyLinks,
        Func<Peal.ContentViolationTooManyVideos, T> onTooManyVideos,
        Func<Peal.ContentViolationMixedMedia, T> onMixedMedia,
        Func<Peal.ContentViolationMediaTypeUnsupported, T> onMediaTypeUnsupported,
        Func<Peal.ContentViolationMediaTooLarge, T> onMediaTooLarge,
        Func<Peal.ContentViolationMediaTooSmall, T> onMediaTooSmall,
        Func<Peal.ContentViolationVideoTooLong, T> onVideoTooLong,
        Func<Peal.ContentViolationVideoTooShort, T> onVideoTooShort,
        Func<Peal.ContentViolationTooManyPixels, T> onTooManyPixels,
        Func<Peal.ContentViolationSideOutOfRange, T> onSideOutOfRange,
        Func<Peal.ContentViolationAspectRatioUnsupported, T> onAspectRatioUnsupported,
        Func<Peal.ContentViolationAltTextTooLong, T> onAltTextTooLong,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "noChannels" => onNoChannels(AsNoChannels()),
            "overrideWithoutChannel" => onOverrideWithoutChannel(AsOverrideWithoutChannel()),
            "optionsWithoutChannel" => onOptionsWithoutChannel(AsOptionsWithoutChannel()),
            "optionsForOtherPlatform" => onOptionsForOtherPlatform(AsOptionsForOtherPlatform()),
            "optionMissing" => onOptionMissing(AsOptionMissing()),
            "optionTooLong" => onOptionTooLong(AsOptionTooLong()),
            "optionInvalid" => onOptionInvalid(AsOptionInvalid()),
            "empty" => onEmpty(AsEmpty()),
            "textTooLong" => onTextTooLong(AsTextTooLong()),
            "forbiddenCharacters" => onForbiddenCharacters(AsForbiddenCharacters()),
            "tooManyMedia" => onTooManyMedia(AsTooManyMedia()),
            "mediaRequired" => onMediaRequired(AsMediaRequired()),
            "tooManyHashtags" => onTooManyHashtags(AsTooManyHashtags()),
            "tooManyMentions" => onTooManyMentions(AsTooManyMentions()),
            "tooManyLinks" => onTooManyLinks(AsTooManyLinks()),
            "tooManyVideos" => onTooManyVideos(AsTooManyVideos()),
            "mixedMedia" => onMixedMedia(AsMixedMedia()),
            "mediaTypeUnsupported" => onMediaTypeUnsupported(AsMediaTypeUnsupported()),
            "mediaTooLarge" => onMediaTooLarge(AsMediaTooLarge()),
            "mediaTooSmall" => onMediaTooSmall(AsMediaTooSmall()),
            "videoTooLong" => onVideoTooLong(AsVideoTooLong()),
            "videoTooShort" => onVideoTooShort(AsVideoTooShort()),
            "tooManyPixels" => onTooManyPixels(AsTooManyPixels()),
            "sideOutOfRange" => onSideOutOfRange(AsSideOutOfRange()),
            "aspectRatioUnsupported" => onAspectRatioUnsupported(AsAspectRatioUnsupported()),
            "altTextTooLong" => onAltTextTooLong(AsAltTextTooLong()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ContentViolationNoChannels> onNoChannels,
        Action<Peal.ContentViolationOverrideWithoutChannel> onOverrideWithoutChannel,
        Action<Peal.ContentViolationOptionsWithoutChannel> onOptionsWithoutChannel,
        Action<Peal.ContentViolationOptionsForOtherPlatform> onOptionsForOtherPlatform,
        Action<Peal.ContentViolationOptionMissing> onOptionMissing,
        Action<Peal.ContentViolationOptionTooLong> onOptionTooLong,
        Action<Peal.ContentViolationOptionInvalid> onOptionInvalid,
        Action<Peal.ContentViolationEmpty> onEmpty,
        Action<Peal.ContentViolationTextTooLong> onTextTooLong,
        Action<Peal.ContentViolationForbiddenCharacters> onForbiddenCharacters,
        Action<Peal.ContentViolationTooManyMedia> onTooManyMedia,
        Action<Peal.ContentViolationMediaRequired> onMediaRequired,
        Action<Peal.ContentViolationTooManyHashtags> onTooManyHashtags,
        Action<Peal.ContentViolationTooManyMentions> onTooManyMentions,
        Action<Peal.ContentViolationTooManyLinks> onTooManyLinks,
        Action<Peal.ContentViolationTooManyVideos> onTooManyVideos,
        Action<Peal.ContentViolationMixedMedia> onMixedMedia,
        Action<Peal.ContentViolationMediaTypeUnsupported> onMediaTypeUnsupported,
        Action<Peal.ContentViolationMediaTooLarge> onMediaTooLarge,
        Action<Peal.ContentViolationMediaTooSmall> onMediaTooSmall,
        Action<Peal.ContentViolationVideoTooLong> onVideoTooLong,
        Action<Peal.ContentViolationVideoTooShort> onVideoTooShort,
        Action<Peal.ContentViolationTooManyPixels> onTooManyPixels,
        Action<Peal.ContentViolationSideOutOfRange> onSideOutOfRange,
        Action<Peal.ContentViolationAspectRatioUnsupported> onAspectRatioUnsupported,
        Action<Peal.ContentViolationAltTextTooLong> onAltTextTooLong,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "noChannels":
                onNoChannels(AsNoChannels());
                break;
            case "overrideWithoutChannel":
                onOverrideWithoutChannel(AsOverrideWithoutChannel());
                break;
            case "optionsWithoutChannel":
                onOptionsWithoutChannel(AsOptionsWithoutChannel());
                break;
            case "optionsForOtherPlatform":
                onOptionsForOtherPlatform(AsOptionsForOtherPlatform());
                break;
            case "optionMissing":
                onOptionMissing(AsOptionMissing());
                break;
            case "optionTooLong":
                onOptionTooLong(AsOptionTooLong());
                break;
            case "optionInvalid":
                onOptionInvalid(AsOptionInvalid());
                break;
            case "empty":
                onEmpty(AsEmpty());
                break;
            case "textTooLong":
                onTextTooLong(AsTextTooLong());
                break;
            case "forbiddenCharacters":
                onForbiddenCharacters(AsForbiddenCharacters());
                break;
            case "tooManyMedia":
                onTooManyMedia(AsTooManyMedia());
                break;
            case "mediaRequired":
                onMediaRequired(AsMediaRequired());
                break;
            case "tooManyHashtags":
                onTooManyHashtags(AsTooManyHashtags());
                break;
            case "tooManyMentions":
                onTooManyMentions(AsTooManyMentions());
                break;
            case "tooManyLinks":
                onTooManyLinks(AsTooManyLinks());
                break;
            case "tooManyVideos":
                onTooManyVideos(AsTooManyVideos());
                break;
            case "mixedMedia":
                onMixedMedia(AsMixedMedia());
                break;
            case "mediaTypeUnsupported":
                onMediaTypeUnsupported(AsMediaTypeUnsupported());
                break;
            case "mediaTooLarge":
                onMediaTooLarge(AsMediaTooLarge());
                break;
            case "mediaTooSmall":
                onMediaTooSmall(AsMediaTooSmall());
                break;
            case "videoTooLong":
                onVideoTooLong(AsVideoTooLong());
                break;
            case "videoTooShort":
                onVideoTooShort(AsVideoTooShort());
                break;
            case "tooManyPixels":
                onTooManyPixels(AsTooManyPixels());
                break;
            case "sideOutOfRange":
                onSideOutOfRange(AsSideOutOfRange());
                break;
            case "aspectRatioUnsupported":
                onAspectRatioUnsupported(AsAspectRatioUnsupported());
                break;
            case "altTextTooLong":
                onAltTextTooLong(AsAltTextTooLong());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationNoChannels"/> and returns true if successful.
    /// </summary>
    public bool TryAsNoChannels(out Peal.ContentViolationNoChannels? value)
    {
        if (Type == "noChannels")
        {
            value = (Peal.ContentViolationNoChannels)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationOverrideWithoutChannel"/> and returns true if successful.
    /// </summary>
    public bool TryAsOverrideWithoutChannel(out Peal.ContentViolationOverrideWithoutChannel? value)
    {
        if (Type == "overrideWithoutChannel")
        {
            value = (Peal.ContentViolationOverrideWithoutChannel)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationOptionsWithoutChannel"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionsWithoutChannel(out Peal.ContentViolationOptionsWithoutChannel? value)
    {
        if (Type == "optionsWithoutChannel")
        {
            value = (Peal.ContentViolationOptionsWithoutChannel)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationOptionsForOtherPlatform"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionsForOtherPlatform(
        out Peal.ContentViolationOptionsForOtherPlatform? value
    )
    {
        if (Type == "optionsForOtherPlatform")
        {
            value = (Peal.ContentViolationOptionsForOtherPlatform)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationOptionMissing"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionMissing(out Peal.ContentViolationOptionMissing? value)
    {
        if (Type == "optionMissing")
        {
            value = (Peal.ContentViolationOptionMissing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationOptionTooLong"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionTooLong(out Peal.ContentViolationOptionTooLong? value)
    {
        if (Type == "optionTooLong")
        {
            value = (Peal.ContentViolationOptionTooLong)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationOptionInvalid"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionInvalid(out Peal.ContentViolationOptionInvalid? value)
    {
        if (Type == "optionInvalid")
        {
            value = (Peal.ContentViolationOptionInvalid)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationEmpty"/> and returns true if successful.
    /// </summary>
    public bool TryAsEmpty(out Peal.ContentViolationEmpty? value)
    {
        if (Type == "empty")
        {
            value = (Peal.ContentViolationEmpty)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTextTooLong"/> and returns true if successful.
    /// </summary>
    public bool TryAsTextTooLong(out Peal.ContentViolationTextTooLong? value)
    {
        if (Type == "textTooLong")
        {
            value = (Peal.ContentViolationTextTooLong)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationForbiddenCharacters"/> and returns true if successful.
    /// </summary>
    public bool TryAsForbiddenCharacters(out Peal.ContentViolationForbiddenCharacters? value)
    {
        if (Type == "forbiddenCharacters")
        {
            value = (Peal.ContentViolationForbiddenCharacters)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTooManyMedia"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyMedia(out Peal.ContentViolationTooManyMedia? value)
    {
        if (Type == "tooManyMedia")
        {
            value = (Peal.ContentViolationTooManyMedia)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationMediaRequired"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaRequired(out Peal.ContentViolationMediaRequired? value)
    {
        if (Type == "mediaRequired")
        {
            value = (Peal.ContentViolationMediaRequired)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTooManyHashtags"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyHashtags(out Peal.ContentViolationTooManyHashtags? value)
    {
        if (Type == "tooManyHashtags")
        {
            value = (Peal.ContentViolationTooManyHashtags)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTooManyMentions"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyMentions(out Peal.ContentViolationTooManyMentions? value)
    {
        if (Type == "tooManyMentions")
        {
            value = (Peal.ContentViolationTooManyMentions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTooManyLinks"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyLinks(out Peal.ContentViolationTooManyLinks? value)
    {
        if (Type == "tooManyLinks")
        {
            value = (Peal.ContentViolationTooManyLinks)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTooManyVideos"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyVideos(out Peal.ContentViolationTooManyVideos? value)
    {
        if (Type == "tooManyVideos")
        {
            value = (Peal.ContentViolationTooManyVideos)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationMixedMedia"/> and returns true if successful.
    /// </summary>
    public bool TryAsMixedMedia(out Peal.ContentViolationMixedMedia? value)
    {
        if (Type == "mixedMedia")
        {
            value = (Peal.ContentViolationMixedMedia)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationMediaTypeUnsupported"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaTypeUnsupported(out Peal.ContentViolationMediaTypeUnsupported? value)
    {
        if (Type == "mediaTypeUnsupported")
        {
            value = (Peal.ContentViolationMediaTypeUnsupported)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationMediaTooLarge"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaTooLarge(out Peal.ContentViolationMediaTooLarge? value)
    {
        if (Type == "mediaTooLarge")
        {
            value = (Peal.ContentViolationMediaTooLarge)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationMediaTooSmall"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaTooSmall(out Peal.ContentViolationMediaTooSmall? value)
    {
        if (Type == "mediaTooSmall")
        {
            value = (Peal.ContentViolationMediaTooSmall)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationVideoTooLong"/> and returns true if successful.
    /// </summary>
    public bool TryAsVideoTooLong(out Peal.ContentViolationVideoTooLong? value)
    {
        if (Type == "videoTooLong")
        {
            value = (Peal.ContentViolationVideoTooLong)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationVideoTooShort"/> and returns true if successful.
    /// </summary>
    public bool TryAsVideoTooShort(out Peal.ContentViolationVideoTooShort? value)
    {
        if (Type == "videoTooShort")
        {
            value = (Peal.ContentViolationVideoTooShort)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationTooManyPixels"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyPixels(out Peal.ContentViolationTooManyPixels? value)
    {
        if (Type == "tooManyPixels")
        {
            value = (Peal.ContentViolationTooManyPixels)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationSideOutOfRange"/> and returns true if successful.
    /// </summary>
    public bool TryAsSideOutOfRange(out Peal.ContentViolationSideOutOfRange? value)
    {
        if (Type == "sideOutOfRange")
        {
            value = (Peal.ContentViolationSideOutOfRange)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationAspectRatioUnsupported"/> and returns true if successful.
    /// </summary>
    public bool TryAsAspectRatioUnsupported(out Peal.ContentViolationAspectRatioUnsupported? value)
    {
        if (Type == "aspectRatioUnsupported")
        {
            value = (Peal.ContentViolationAspectRatioUnsupported)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ContentViolationAltTextTooLong"/> and returns true if successful.
    /// </summary>
    public bool TryAsAltTextTooLong(out Peal.ContentViolationAltTextTooLong? value)
    {
        if (Type == "altTextTooLong")
        {
            value = (Peal.ContentViolationAltTextTooLong)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ContentViolation(ContentViolation.NoChannels value) =>
        new(value);

    public static implicit operator ContentViolation(
        ContentViolation.OverrideWithoutChannel value
    ) => new(value);

    public static implicit operator ContentViolation(
        ContentViolation.OptionsWithoutChannel value
    ) => new(value);

    public static implicit operator ContentViolation(
        ContentViolation.OptionsForOtherPlatform value
    ) => new(value);

    public static implicit operator ContentViolation(ContentViolation.OptionMissing value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.OptionTooLong value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.OptionInvalid value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.Empty value) => new(value);

    public static implicit operator ContentViolation(ContentViolation.TextTooLong value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.ForbiddenCharacters value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.TooManyMedia value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.MediaRequired value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.TooManyHashtags value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.TooManyMentions value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.TooManyLinks value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.TooManyVideos value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.MixedMedia value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.MediaTypeUnsupported value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.MediaTooLarge value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.MediaTooSmall value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.VideoTooLong value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.VideoTooShort value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.TooManyPixels value) =>
        new(value);

    public static implicit operator ContentViolation(ContentViolation.SideOutOfRange value) =>
        new(value);

    public static implicit operator ContentViolation(
        ContentViolation.AspectRatioUnsupported value
    ) => new(value);

    public static implicit operator ContentViolation(ContentViolation.AltTextTooLong value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ContentViolation>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ContentViolation).IsAssignableFrom(typeToConvert);

        public override ContentViolation Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("_tag", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property '_tag'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property '_tag' is null");
                }

                throw new JsonException(
                    $"Discriminator property '_tag' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property '_tag' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("_tag");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "noChannels" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationNoChannels?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationNoChannels"
                        ),
                "overrideWithoutChannel" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationOverrideWithoutChannel?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationOverrideWithoutChannel"
                        ),
                "optionsWithoutChannel" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationOptionsWithoutChannel?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationOptionsWithoutChannel"
                        ),
                "optionsForOtherPlatform" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationOptionsForOtherPlatform?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationOptionsForOtherPlatform"
                        ),
                "optionMissing" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationOptionMissing?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationOptionMissing"
                        ),
                "optionTooLong" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationOptionTooLong?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationOptionTooLong"
                        ),
                "optionInvalid" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationOptionInvalid?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationOptionInvalid"
                        ),
                "empty" => jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationEmpty?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ContentViolationEmpty"),
                "textTooLong" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTextTooLong?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTextTooLong"
                        ),
                "forbiddenCharacters" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationForbiddenCharacters?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationForbiddenCharacters"
                        ),
                "tooManyMedia" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTooManyMedia?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTooManyMedia"
                        ),
                "mediaRequired" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationMediaRequired?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationMediaRequired"
                        ),
                "tooManyHashtags" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTooManyHashtags?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTooManyHashtags"
                        ),
                "tooManyMentions" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTooManyMentions?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTooManyMentions"
                        ),
                "tooManyLinks" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTooManyLinks?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTooManyLinks"
                        ),
                "tooManyVideos" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTooManyVideos?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTooManyVideos"
                        ),
                "mixedMedia" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationMixedMedia?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationMixedMedia"
                        ),
                "mediaTypeUnsupported" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationMediaTypeUnsupported?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationMediaTypeUnsupported"
                        ),
                "mediaTooLarge" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationMediaTooLarge?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationMediaTooLarge"
                        ),
                "mediaTooSmall" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationMediaTooSmall?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationMediaTooSmall"
                        ),
                "videoTooLong" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationVideoTooLong?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationVideoTooLong"
                        ),
                "videoTooShort" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationVideoTooShort?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationVideoTooShort"
                        ),
                "tooManyPixels" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationTooManyPixels?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationTooManyPixels"
                        ),
                "sideOutOfRange" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationSideOutOfRange?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationSideOutOfRange"
                        ),
                "aspectRatioUnsupported" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationAspectRatioUnsupported?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationAspectRatioUnsupported"
                        ),
                "altTextTooLong" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ContentViolationAltTextTooLong?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ContentViolationAltTextTooLong"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new ContentViolation(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ContentViolation value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "noChannels" => JsonSerializer.SerializeToNode(value.Value, options),
                    "overrideWithoutChannel" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "optionsWithoutChannel" => JsonSerializer.SerializeToNode(value.Value, options),
                    "optionsForOtherPlatform" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "optionMissing" => JsonSerializer.SerializeToNode(value.Value, options),
                    "optionTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    "optionInvalid" => JsonSerializer.SerializeToNode(value.Value, options),
                    "empty" => JsonSerializer.SerializeToNode(value.Value, options),
                    "textTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    "forbiddenCharacters" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyMedia" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mediaRequired" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyHashtags" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyMentions" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyLinks" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyVideos" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mixedMedia" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mediaTypeUnsupported" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mediaTooLarge" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mediaTooSmall" => JsonSerializer.SerializeToNode(value.Value, options),
                    "videoTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    "videoTooShort" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyPixels" => JsonSerializer.SerializeToNode(value.Value, options),
                    "sideOutOfRange" => JsonSerializer.SerializeToNode(value.Value, options),
                    "aspectRatioUnsupported" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "altTextTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ContentViolation ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ContentViolation(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ContentViolation value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for noChannels
    /// </summary>
    [Serializable]
    public struct NoChannels
    {
        public NoChannels(Peal.ContentViolationNoChannels value)
        {
            Value = value;
        }

        internal Peal.ContentViolationNoChannels Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.NoChannels(
            Peal.ContentViolationNoChannels value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for overrideWithoutChannel
    /// </summary>
    [Serializable]
    public struct OverrideWithoutChannel
    {
        public OverrideWithoutChannel(Peal.ContentViolationOverrideWithoutChannel value)
        {
            Value = value;
        }

        internal Peal.ContentViolationOverrideWithoutChannel Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.OverrideWithoutChannel(
            Peal.ContentViolationOverrideWithoutChannel value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for optionsWithoutChannel
    /// </summary>
    [Serializable]
    public struct OptionsWithoutChannel
    {
        public OptionsWithoutChannel(Peal.ContentViolationOptionsWithoutChannel value)
        {
            Value = value;
        }

        internal Peal.ContentViolationOptionsWithoutChannel Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.OptionsWithoutChannel(
            Peal.ContentViolationOptionsWithoutChannel value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for optionsForOtherPlatform
    /// </summary>
    [Serializable]
    public struct OptionsForOtherPlatform
    {
        public OptionsForOtherPlatform(Peal.ContentViolationOptionsForOtherPlatform value)
        {
            Value = value;
        }

        internal Peal.ContentViolationOptionsForOtherPlatform Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.OptionsForOtherPlatform(
            Peal.ContentViolationOptionsForOtherPlatform value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for optionMissing
    /// </summary>
    [Serializable]
    public struct OptionMissing
    {
        public OptionMissing(Peal.ContentViolationOptionMissing value)
        {
            Value = value;
        }

        internal Peal.ContentViolationOptionMissing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.OptionMissing(
            Peal.ContentViolationOptionMissing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for optionTooLong
    /// </summary>
    [Serializable]
    public struct OptionTooLong
    {
        public OptionTooLong(Peal.ContentViolationOptionTooLong value)
        {
            Value = value;
        }

        internal Peal.ContentViolationOptionTooLong Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.OptionTooLong(
            Peal.ContentViolationOptionTooLong value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for optionInvalid
    /// </summary>
    [Serializable]
    public struct OptionInvalid
    {
        public OptionInvalid(Peal.ContentViolationOptionInvalid value)
        {
            Value = value;
        }

        internal Peal.ContentViolationOptionInvalid Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.OptionInvalid(
            Peal.ContentViolationOptionInvalid value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for empty
    /// </summary>
    [Serializable]
    public struct Empty
    {
        public Empty(Peal.ContentViolationEmpty value)
        {
            Value = value;
        }

        internal Peal.ContentViolationEmpty Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.Empty(Peal.ContentViolationEmpty value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for textTooLong
    /// </summary>
    [Serializable]
    public struct TextTooLong
    {
        public TextTooLong(Peal.ContentViolationTextTooLong value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTextTooLong Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TextTooLong(
            Peal.ContentViolationTextTooLong value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for forbiddenCharacters
    /// </summary>
    [Serializable]
    public struct ForbiddenCharacters
    {
        public ForbiddenCharacters(Peal.ContentViolationForbiddenCharacters value)
        {
            Value = value;
        }

        internal Peal.ContentViolationForbiddenCharacters Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.ForbiddenCharacters(
            Peal.ContentViolationForbiddenCharacters value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyMedia
    /// </summary>
    [Serializable]
    public struct TooManyMedia
    {
        public TooManyMedia(Peal.ContentViolationTooManyMedia value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTooManyMedia Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TooManyMedia(
            Peal.ContentViolationTooManyMedia value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for mediaRequired
    /// </summary>
    [Serializable]
    public struct MediaRequired
    {
        public MediaRequired(Peal.ContentViolationMediaRequired value)
        {
            Value = value;
        }

        internal Peal.ContentViolationMediaRequired Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.MediaRequired(
            Peal.ContentViolationMediaRequired value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyHashtags
    /// </summary>
    [Serializable]
    public struct TooManyHashtags
    {
        public TooManyHashtags(Peal.ContentViolationTooManyHashtags value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTooManyHashtags Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TooManyHashtags(
            Peal.ContentViolationTooManyHashtags value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyMentions
    /// </summary>
    [Serializable]
    public struct TooManyMentions
    {
        public TooManyMentions(Peal.ContentViolationTooManyMentions value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTooManyMentions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TooManyMentions(
            Peal.ContentViolationTooManyMentions value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyLinks
    /// </summary>
    [Serializable]
    public struct TooManyLinks
    {
        public TooManyLinks(Peal.ContentViolationTooManyLinks value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTooManyLinks Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TooManyLinks(
            Peal.ContentViolationTooManyLinks value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyVideos
    /// </summary>
    [Serializable]
    public struct TooManyVideos
    {
        public TooManyVideos(Peal.ContentViolationTooManyVideos value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTooManyVideos Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TooManyVideos(
            Peal.ContentViolationTooManyVideos value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for mixedMedia
    /// </summary>
    [Serializable]
    public struct MixedMedia
    {
        public MixedMedia(Peal.ContentViolationMixedMedia value)
        {
            Value = value;
        }

        internal Peal.ContentViolationMixedMedia Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.MixedMedia(
            Peal.ContentViolationMixedMedia value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for mediaTypeUnsupported
    /// </summary>
    [Serializable]
    public struct MediaTypeUnsupported
    {
        public MediaTypeUnsupported(Peal.ContentViolationMediaTypeUnsupported value)
        {
            Value = value;
        }

        internal Peal.ContentViolationMediaTypeUnsupported Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.MediaTypeUnsupported(
            Peal.ContentViolationMediaTypeUnsupported value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for mediaTooLarge
    /// </summary>
    [Serializable]
    public struct MediaTooLarge
    {
        public MediaTooLarge(Peal.ContentViolationMediaTooLarge value)
        {
            Value = value;
        }

        internal Peal.ContentViolationMediaTooLarge Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.MediaTooLarge(
            Peal.ContentViolationMediaTooLarge value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for mediaTooSmall
    /// </summary>
    [Serializable]
    public struct MediaTooSmall
    {
        public MediaTooSmall(Peal.ContentViolationMediaTooSmall value)
        {
            Value = value;
        }

        internal Peal.ContentViolationMediaTooSmall Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.MediaTooSmall(
            Peal.ContentViolationMediaTooSmall value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for videoTooLong
    /// </summary>
    [Serializable]
    public struct VideoTooLong
    {
        public VideoTooLong(Peal.ContentViolationVideoTooLong value)
        {
            Value = value;
        }

        internal Peal.ContentViolationVideoTooLong Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.VideoTooLong(
            Peal.ContentViolationVideoTooLong value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for videoTooShort
    /// </summary>
    [Serializable]
    public struct VideoTooShort
    {
        public VideoTooShort(Peal.ContentViolationVideoTooShort value)
        {
            Value = value;
        }

        internal Peal.ContentViolationVideoTooShort Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.VideoTooShort(
            Peal.ContentViolationVideoTooShort value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyPixels
    /// </summary>
    [Serializable]
    public struct TooManyPixels
    {
        public TooManyPixels(Peal.ContentViolationTooManyPixels value)
        {
            Value = value;
        }

        internal Peal.ContentViolationTooManyPixels Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.TooManyPixels(
            Peal.ContentViolationTooManyPixels value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for sideOutOfRange
    /// </summary>
    [Serializable]
    public struct SideOutOfRange
    {
        public SideOutOfRange(Peal.ContentViolationSideOutOfRange value)
        {
            Value = value;
        }

        internal Peal.ContentViolationSideOutOfRange Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.SideOutOfRange(
            Peal.ContentViolationSideOutOfRange value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for aspectRatioUnsupported
    /// </summary>
    [Serializable]
    public struct AspectRatioUnsupported
    {
        public AspectRatioUnsupported(Peal.ContentViolationAspectRatioUnsupported value)
        {
            Value = value;
        }

        internal Peal.ContentViolationAspectRatioUnsupported Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.AspectRatioUnsupported(
            Peal.ContentViolationAspectRatioUnsupported value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for altTextTooLong
    /// </summary>
    [Serializable]
    public struct AltTextTooLong
    {
        public AltTextTooLong(Peal.ContentViolationAltTextTooLong value)
        {
            Value = value;
        }

        internal Peal.ContentViolationAltTextTooLong Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ContentViolation.AltTextTooLong(
            Peal.ContentViolationAltTextTooLong value
        ) => new(value);
    }
}
