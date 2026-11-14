// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ArticleViolation.JsonConverter))]
[Serializable]
public record ArticleViolation
{
    internal ArticleViolation(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.TitleMissing"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.TitleMissing value)
    {
        Type = "titleMissing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.TitleTooLong"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.TitleTooLong value)
    {
        Type = "titleTooLong";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.BodyMissing"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.BodyMissing value)
    {
        Type = "bodyMissing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.BodyInvalid"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.BodyInvalid value)
    {
        Type = "bodyInvalid";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.ExcerptTooLong"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.ExcerptTooLong value)
    {
        Type = "excerptTooLong";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.TooManyTerms"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.TooManyTerms value)
    {
        Type = "tooManyTerms";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.TermInvalid"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.TermInvalid value)
    {
        Type = "termInvalid";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.SiteTimeInPast"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.SiteTimeInPast value)
    {
        Type = "siteTimeInPast";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.TimeInPast"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.TimeInPast value)
    {
        Type = "timeInPast";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.CoverNotImage"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.CoverNotImage value)
    {
        Type = "coverNotImage";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleViolation with <see cref="ArticleViolation.ApprovalRequired"/>.
    /// </summary>
    public ArticleViolation(ArticleViolation.ApprovalRequired value)
    {
        Type = "approvalRequired";
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
    /// Returns true if <see cref="Type"/> is "titleMissing"
    /// </summary>
    public bool IsTitleMissing => Type == "titleMissing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "titleTooLong"
    /// </summary>
    public bool IsTitleTooLong => Type == "titleTooLong";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "bodyMissing"
    /// </summary>
    public bool IsBodyMissing => Type == "bodyMissing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "bodyInvalid"
    /// </summary>
    public bool IsBodyInvalid => Type == "bodyInvalid";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "excerptTooLong"
    /// </summary>
    public bool IsExcerptTooLong => Type == "excerptTooLong";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tooManyTerms"
    /// </summary>
    public bool IsTooManyTerms => Type == "tooManyTerms";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "termInvalid"
    /// </summary>
    public bool IsTermInvalid => Type == "termInvalid";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "siteTimeInPast"
    /// </summary>
    public bool IsSiteTimeInPast => Type == "siteTimeInPast";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "timeInPast"
    /// </summary>
    public bool IsTimeInPast => Type == "timeInPast";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "coverNotImage"
    /// </summary>
    public bool IsCoverNotImage => Type == "coverNotImage";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "approvalRequired"
    /// </summary>
    public bool IsApprovalRequired => Type == "approvalRequired";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationTitleMissing"/> if <see cref="Type"/> is 'titleMissing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'titleMissing'.</exception>
    public Peal.ArticleViolationTitleMissing AsTitleMissing() =>
        IsTitleMissing
            ? (Peal.ArticleViolationTitleMissing)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'titleMissing'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationTitleTooLong"/> if <see cref="Type"/> is 'titleTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'titleTooLong'.</exception>
    public Peal.ArticleViolationTitleTooLong AsTitleTooLong() =>
        IsTitleTooLong
            ? (Peal.ArticleViolationTitleTooLong)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'titleTooLong'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationBodyMissing"/> if <see cref="Type"/> is 'bodyMissing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'bodyMissing'.</exception>
    public Peal.ArticleViolationBodyMissing AsBodyMissing() =>
        IsBodyMissing
            ? (Peal.ArticleViolationBodyMissing)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'bodyMissing'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationBodyInvalid"/> if <see cref="Type"/> is 'bodyInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'bodyInvalid'.</exception>
    public Peal.ArticleViolationBodyInvalid AsBodyInvalid() =>
        IsBodyInvalid
            ? (Peal.ArticleViolationBodyInvalid)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'bodyInvalid'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationExcerptTooLong"/> if <see cref="Type"/> is 'excerptTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'excerptTooLong'.</exception>
    public Peal.ArticleViolationExcerptTooLong AsExcerptTooLong() =>
        IsExcerptTooLong
            ? (Peal.ArticleViolationExcerptTooLong)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'excerptTooLong'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationTooManyTerms"/> if <see cref="Type"/> is 'tooManyTerms', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tooManyTerms'.</exception>
    public Peal.ArticleViolationTooManyTerms AsTooManyTerms() =>
        IsTooManyTerms
            ? (Peal.ArticleViolationTooManyTerms)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'tooManyTerms'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationTermInvalid"/> if <see cref="Type"/> is 'termInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'termInvalid'.</exception>
    public Peal.ArticleViolationTermInvalid AsTermInvalid() =>
        IsTermInvalid
            ? (Peal.ArticleViolationTermInvalid)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'termInvalid'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationSiteTimeInPast"/> if <see cref="Type"/> is 'siteTimeInPast', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'siteTimeInPast'.</exception>
    public Peal.ArticleViolationSiteTimeInPast AsSiteTimeInPast() =>
        IsSiteTimeInPast
            ? (Peal.ArticleViolationSiteTimeInPast)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'siteTimeInPast'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationTimeInPast"/> if <see cref="Type"/> is 'timeInPast', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'timeInPast'.</exception>
    public Peal.ArticleViolationTimeInPast AsTimeInPast() =>
        IsTimeInPast
            ? (Peal.ArticleViolationTimeInPast)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'timeInPast'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationCoverNotImage"/> if <see cref="Type"/> is 'coverNotImage', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'coverNotImage'.</exception>
    public Peal.ArticleViolationCoverNotImage AsCoverNotImage() =>
        IsCoverNotImage
            ? (Peal.ArticleViolationCoverNotImage)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'coverNotImage'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleViolationApprovalRequired"/> if <see cref="Type"/> is 'approvalRequired', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'approvalRequired'.</exception>
    public Peal.ArticleViolationApprovalRequired AsApprovalRequired() =>
        IsApprovalRequired
            ? (Peal.ArticleViolationApprovalRequired)Value!
            : throw new global::System.Exception("ArticleViolation.Type is not 'approvalRequired'");

    public T Match<T>(
        Func<Peal.ArticleViolationTitleMissing, T> onTitleMissing,
        Func<Peal.ArticleViolationTitleTooLong, T> onTitleTooLong,
        Func<Peal.ArticleViolationBodyMissing, T> onBodyMissing,
        Func<Peal.ArticleViolationBodyInvalid, T> onBodyInvalid,
        Func<Peal.ArticleViolationExcerptTooLong, T> onExcerptTooLong,
        Func<Peal.ArticleViolationTooManyTerms, T> onTooManyTerms,
        Func<Peal.ArticleViolationTermInvalid, T> onTermInvalid,
        Func<Peal.ArticleViolationSiteTimeInPast, T> onSiteTimeInPast,
        Func<Peal.ArticleViolationTimeInPast, T> onTimeInPast,
        Func<Peal.ArticleViolationCoverNotImage, T> onCoverNotImage,
        Func<Peal.ArticleViolationApprovalRequired, T> onApprovalRequired,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "titleMissing" => onTitleMissing(AsTitleMissing()),
            "titleTooLong" => onTitleTooLong(AsTitleTooLong()),
            "bodyMissing" => onBodyMissing(AsBodyMissing()),
            "bodyInvalid" => onBodyInvalid(AsBodyInvalid()),
            "excerptTooLong" => onExcerptTooLong(AsExcerptTooLong()),
            "tooManyTerms" => onTooManyTerms(AsTooManyTerms()),
            "termInvalid" => onTermInvalid(AsTermInvalid()),
            "siteTimeInPast" => onSiteTimeInPast(AsSiteTimeInPast()),
            "timeInPast" => onTimeInPast(AsTimeInPast()),
            "coverNotImage" => onCoverNotImage(AsCoverNotImage()),
            "approvalRequired" => onApprovalRequired(AsApprovalRequired()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ArticleViolationTitleMissing> onTitleMissing,
        Action<Peal.ArticleViolationTitleTooLong> onTitleTooLong,
        Action<Peal.ArticleViolationBodyMissing> onBodyMissing,
        Action<Peal.ArticleViolationBodyInvalid> onBodyInvalid,
        Action<Peal.ArticleViolationExcerptTooLong> onExcerptTooLong,
        Action<Peal.ArticleViolationTooManyTerms> onTooManyTerms,
        Action<Peal.ArticleViolationTermInvalid> onTermInvalid,
        Action<Peal.ArticleViolationSiteTimeInPast> onSiteTimeInPast,
        Action<Peal.ArticleViolationTimeInPast> onTimeInPast,
        Action<Peal.ArticleViolationCoverNotImage> onCoverNotImage,
        Action<Peal.ArticleViolationApprovalRequired> onApprovalRequired,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "titleMissing":
                onTitleMissing(AsTitleMissing());
                break;
            case "titleTooLong":
                onTitleTooLong(AsTitleTooLong());
                break;
            case "bodyMissing":
                onBodyMissing(AsBodyMissing());
                break;
            case "bodyInvalid":
                onBodyInvalid(AsBodyInvalid());
                break;
            case "excerptTooLong":
                onExcerptTooLong(AsExcerptTooLong());
                break;
            case "tooManyTerms":
                onTooManyTerms(AsTooManyTerms());
                break;
            case "termInvalid":
                onTermInvalid(AsTermInvalid());
                break;
            case "siteTimeInPast":
                onSiteTimeInPast(AsSiteTimeInPast());
                break;
            case "timeInPast":
                onTimeInPast(AsTimeInPast());
                break;
            case "coverNotImage":
                onCoverNotImage(AsCoverNotImage());
                break;
            case "approvalRequired":
                onApprovalRequired(AsApprovalRequired());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationTitleMissing"/> and returns true if successful.
    /// </summary>
    public bool TryAsTitleMissing(out Peal.ArticleViolationTitleMissing? value)
    {
        if (Type == "titleMissing")
        {
            value = (Peal.ArticleViolationTitleMissing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationTitleTooLong"/> and returns true if successful.
    /// </summary>
    public bool TryAsTitleTooLong(out Peal.ArticleViolationTitleTooLong? value)
    {
        if (Type == "titleTooLong")
        {
            value = (Peal.ArticleViolationTitleTooLong)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationBodyMissing"/> and returns true if successful.
    /// </summary>
    public bool TryAsBodyMissing(out Peal.ArticleViolationBodyMissing? value)
    {
        if (Type == "bodyMissing")
        {
            value = (Peal.ArticleViolationBodyMissing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationBodyInvalid"/> and returns true if successful.
    /// </summary>
    public bool TryAsBodyInvalid(out Peal.ArticleViolationBodyInvalid? value)
    {
        if (Type == "bodyInvalid")
        {
            value = (Peal.ArticleViolationBodyInvalid)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationExcerptTooLong"/> and returns true if successful.
    /// </summary>
    public bool TryAsExcerptTooLong(out Peal.ArticleViolationExcerptTooLong? value)
    {
        if (Type == "excerptTooLong")
        {
            value = (Peal.ArticleViolationExcerptTooLong)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationTooManyTerms"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyTerms(out Peal.ArticleViolationTooManyTerms? value)
    {
        if (Type == "tooManyTerms")
        {
            value = (Peal.ArticleViolationTooManyTerms)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationTermInvalid"/> and returns true if successful.
    /// </summary>
    public bool TryAsTermInvalid(out Peal.ArticleViolationTermInvalid? value)
    {
        if (Type == "termInvalid")
        {
            value = (Peal.ArticleViolationTermInvalid)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationSiteTimeInPast"/> and returns true if successful.
    /// </summary>
    public bool TryAsSiteTimeInPast(out Peal.ArticleViolationSiteTimeInPast? value)
    {
        if (Type == "siteTimeInPast")
        {
            value = (Peal.ArticleViolationSiteTimeInPast)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationTimeInPast"/> and returns true if successful.
    /// </summary>
    public bool TryAsTimeInPast(out Peal.ArticleViolationTimeInPast? value)
    {
        if (Type == "timeInPast")
        {
            value = (Peal.ArticleViolationTimeInPast)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationCoverNotImage"/> and returns true if successful.
    /// </summary>
    public bool TryAsCoverNotImage(out Peal.ArticleViolationCoverNotImage? value)
    {
        if (Type == "coverNotImage")
        {
            value = (Peal.ArticleViolationCoverNotImage)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleViolationApprovalRequired"/> and returns true if successful.
    /// </summary>
    public bool TryAsApprovalRequired(out Peal.ArticleViolationApprovalRequired? value)
    {
        if (Type == "approvalRequired")
        {
            value = (Peal.ArticleViolationApprovalRequired)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ArticleViolation(ArticleViolation.TitleMissing value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.TitleTooLong value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.BodyMissing value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.BodyInvalid value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.ExcerptTooLong value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.TooManyTerms value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.TermInvalid value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.SiteTimeInPast value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.TimeInPast value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.CoverNotImage value) =>
        new(value);

    public static implicit operator ArticleViolation(ArticleViolation.ApprovalRequired value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ArticleViolation>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ArticleViolation).IsAssignableFrom(typeToConvert);

        public override ArticleViolation Read(
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
                "titleMissing" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationTitleMissing?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationTitleMissing"
                        ),
                "titleTooLong" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationTitleTooLong?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationTitleTooLong"
                        ),
                "bodyMissing" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationBodyMissing?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationBodyMissing"
                        ),
                "bodyInvalid" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationBodyInvalid?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationBodyInvalid"
                        ),
                "excerptTooLong" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationExcerptTooLong?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationExcerptTooLong"
                        ),
                "tooManyTerms" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationTooManyTerms?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationTooManyTerms"
                        ),
                "termInvalid" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationTermInvalid?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationTermInvalid"
                        ),
                "siteTimeInPast" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationSiteTimeInPast?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationSiteTimeInPast"
                        ),
                "timeInPast" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationTimeInPast?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationTimeInPast"
                        ),
                "coverNotImage" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationCoverNotImage?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationCoverNotImage"
                        ),
                "approvalRequired" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleViolationApprovalRequired?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleViolationApprovalRequired"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new ArticleViolation(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ArticleViolation value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "titleMissing" => JsonSerializer.SerializeToNode(value.Value, options),
                    "titleTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    "bodyMissing" => JsonSerializer.SerializeToNode(value.Value, options),
                    "bodyInvalid" => JsonSerializer.SerializeToNode(value.Value, options),
                    "excerptTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tooManyTerms" => JsonSerializer.SerializeToNode(value.Value, options),
                    "termInvalid" => JsonSerializer.SerializeToNode(value.Value, options),
                    "siteTimeInPast" => JsonSerializer.SerializeToNode(value.Value, options),
                    "timeInPast" => JsonSerializer.SerializeToNode(value.Value, options),
                    "coverNotImage" => JsonSerializer.SerializeToNode(value.Value, options),
                    "approvalRequired" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ArticleViolation ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ArticleViolation(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ArticleViolation value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for titleMissing
    /// </summary>
    [Serializable]
    public struct TitleMissing
    {
        public TitleMissing(Peal.ArticleViolationTitleMissing value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationTitleMissing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.TitleMissing(
            Peal.ArticleViolationTitleMissing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for titleTooLong
    /// </summary>
    [Serializable]
    public struct TitleTooLong
    {
        public TitleTooLong(Peal.ArticleViolationTitleTooLong value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationTitleTooLong Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.TitleTooLong(
            Peal.ArticleViolationTitleTooLong value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for bodyMissing
    /// </summary>
    [Serializable]
    public struct BodyMissing
    {
        public BodyMissing(Peal.ArticleViolationBodyMissing value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationBodyMissing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.BodyMissing(
            Peal.ArticleViolationBodyMissing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for bodyInvalid
    /// </summary>
    [Serializable]
    public struct BodyInvalid
    {
        public BodyInvalid(Peal.ArticleViolationBodyInvalid value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationBodyInvalid Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.BodyInvalid(
            Peal.ArticleViolationBodyInvalid value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for excerptTooLong
    /// </summary>
    [Serializable]
    public struct ExcerptTooLong
    {
        public ExcerptTooLong(Peal.ArticleViolationExcerptTooLong value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationExcerptTooLong Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.ExcerptTooLong(
            Peal.ArticleViolationExcerptTooLong value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tooManyTerms
    /// </summary>
    [Serializable]
    public struct TooManyTerms
    {
        public TooManyTerms(Peal.ArticleViolationTooManyTerms value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationTooManyTerms Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.TooManyTerms(
            Peal.ArticleViolationTooManyTerms value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for termInvalid
    /// </summary>
    [Serializable]
    public struct TermInvalid
    {
        public TermInvalid(Peal.ArticleViolationTermInvalid value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationTermInvalid Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.TermInvalid(
            Peal.ArticleViolationTermInvalid value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for siteTimeInPast
    /// </summary>
    [Serializable]
    public struct SiteTimeInPast
    {
        public SiteTimeInPast(Peal.ArticleViolationSiteTimeInPast value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationSiteTimeInPast Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.SiteTimeInPast(
            Peal.ArticleViolationSiteTimeInPast value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for timeInPast
    /// </summary>
    [Serializable]
    public struct TimeInPast
    {
        public TimeInPast(Peal.ArticleViolationTimeInPast value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationTimeInPast Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.TimeInPast(
            Peal.ArticleViolationTimeInPast value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for coverNotImage
    /// </summary>
    [Serializable]
    public struct CoverNotImage
    {
        public CoverNotImage(Peal.ArticleViolationCoverNotImage value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationCoverNotImage Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.CoverNotImage(
            Peal.ArticleViolationCoverNotImage value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for approvalRequired
    /// </summary>
    [Serializable]
    public struct ApprovalRequired
    {
        public ApprovalRequired(Peal.ArticleViolationApprovalRequired value)
        {
            Value = value;
        }

        internal Peal.ArticleViolationApprovalRequired Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleViolation.ApprovalRequired(
            Peal.ArticleViolationApprovalRequired value
        ) => new(value);
    }
}
