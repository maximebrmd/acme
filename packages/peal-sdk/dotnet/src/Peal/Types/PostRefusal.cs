// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostRefusal.JsonConverter))]
[Serializable]
public record PostRefusal
{
    internal PostRefusal(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.PostContentInvalid"/>.
    /// </summary>
    public PostRefusal(PostRefusal.PostContentInvalid value)
    {
        Type = "PostContentInvalid";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.UnknownChannels"/>.
    /// </summary>
    public PostRefusal(PostRefusal.UnknownChannels value)
    {
        Type = "UnknownChannels";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.UnknownMedia"/>.
    /// </summary>
    public PostRefusal(PostRefusal.UnknownMedia value)
    {
        Type = "UnknownMedia";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.ScheduleInPast"/>.
    /// </summary>
    public PostRefusal(PostRefusal.ScheduleInPast value)
    {
        Type = "ScheduleInPast";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.InvalidTimeZone"/>.
    /// </summary>
    public PostRefusal(PostRefusal.InvalidTimeZone value)
    {
        Type = "InvalidTimeZone";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.PlanLimitReached"/>.
    /// </summary>
    public PostRefusal(PostRefusal.PlanLimitReached value)
    {
        Type = "PlanLimitReached";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.IdempotencyKeyReused"/>.
    /// </summary>
    public PostRefusal(PostRefusal.IdempotencyKeyReused value)
    {
        Type = "IdempotencyKeyReused";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.PostNotFound"/>.
    /// </summary>
    public PostRefusal(PostRefusal.PostNotFound value)
    {
        Type = "PostNotFound";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.DuplicatePost"/>.
    /// </summary>
    public PostRefusal(PostRefusal.DuplicatePost value)
    {
        Type = "DuplicatePost";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.Forbidden"/>.
    /// </summary>
    public PostRefusal(PostRefusal.Forbidden value)
    {
        Type = "Forbidden";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.UnknownTags"/>.
    /// </summary>
    public PostRefusal(PostRefusal.UnknownTags value)
    {
        Type = "UnknownTags";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.ChannelSetNotFound"/>.
    /// </summary>
    public PostRefusal(PostRefusal.ChannelSetNotFound value)
    {
        Type = "ChannelSetNotFound";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostRefusal with <see cref="PostRefusal.SignatureNotFound"/>.
    /// </summary>
    public PostRefusal(PostRefusal.SignatureNotFound value)
    {
        Type = "SignatureNotFound";
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
    /// Returns true if <see cref="Type"/> is "PostContentInvalid"
    /// </summary>
    public bool IsPostContentInvalid => Type == "PostContentInvalid";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "UnknownChannels"
    /// </summary>
    public bool IsUnknownChannels => Type == "UnknownChannels";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "UnknownMedia"
    /// </summary>
    public bool IsUnknownMedia => Type == "UnknownMedia";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ScheduleInPast"
    /// </summary>
    public bool IsScheduleInPast => Type == "ScheduleInPast";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "InvalidTimeZone"
    /// </summary>
    public bool IsInvalidTimeZone => Type == "InvalidTimeZone";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PlanLimitReached"
    /// </summary>
    public bool IsPlanLimitReached => Type == "PlanLimitReached";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "IdempotencyKeyReused"
    /// </summary>
    public bool IsIdempotencyKeyReused => Type == "IdempotencyKeyReused";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostNotFound"
    /// </summary>
    public bool IsPostNotFound => Type == "PostNotFound";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "DuplicatePost"
    /// </summary>
    public bool IsDuplicatePost => Type == "DuplicatePost";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "Forbidden"
    /// </summary>
    public bool IsForbidden => Type == "Forbidden";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "UnknownTags"
    /// </summary>
    public bool IsUnknownTags => Type == "UnknownTags";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelSetNotFound"
    /// </summary>
    public bool IsChannelSetNotFound => Type == "ChannelSetNotFound";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SignatureNotFound"
    /// </summary>
    public bool IsSignatureNotFound => Type == "SignatureNotFound";

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostContentInvalidEncoded"/> if <see cref="Type"/> is 'PostContentInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostContentInvalid'.</exception>
    public Peal.PostContentInvalidEncoded AsPostContentInvalid() =>
        IsPostContentInvalid
            ? (Peal.PostContentInvalidEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'PostContentInvalid'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.UnknownChannelsEncoded"/> if <see cref="Type"/> is 'UnknownChannels', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UnknownChannels'.</exception>
    public Peal.UnknownChannelsEncoded AsUnknownChannels() =>
        IsUnknownChannels
            ? (Peal.UnknownChannelsEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'UnknownChannels'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.UnknownMediaEncoded"/> if <see cref="Type"/> is 'UnknownMedia', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UnknownMedia'.</exception>
    public Peal.UnknownMediaEncoded AsUnknownMedia() =>
        IsUnknownMedia
            ? (Peal.UnknownMediaEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'UnknownMedia'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ScheduleInPastEncoded"/> if <see cref="Type"/> is 'ScheduleInPast', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ScheduleInPast'.</exception>
    public Peal.ScheduleInPastEncoded AsScheduleInPast() =>
        IsScheduleInPast
            ? (Peal.ScheduleInPastEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'ScheduleInPast'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.InvalidTimeZoneEncoded"/> if <see cref="Type"/> is 'InvalidTimeZone', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'InvalidTimeZone'.</exception>
    public Peal.InvalidTimeZoneEncoded AsInvalidTimeZone() =>
        IsInvalidTimeZone
            ? (Peal.InvalidTimeZoneEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'InvalidTimeZone'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PlanLimitReachedEncoded"/> if <see cref="Type"/> is 'PlanLimitReached', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PlanLimitReached'.</exception>
    public Peal.PlanLimitReachedEncoded AsPlanLimitReached() =>
        IsPlanLimitReached
            ? (Peal.PlanLimitReachedEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'PlanLimitReached'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.IdempotencyKeyReusedEncoded"/> if <see cref="Type"/> is 'IdempotencyKeyReused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'IdempotencyKeyReused'.</exception>
    public Peal.IdempotencyKeyReusedEncoded AsIdempotencyKeyReused() =>
        IsIdempotencyKeyReused
            ? (Peal.IdempotencyKeyReusedEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'IdempotencyKeyReused'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostNotFoundEncoded"/> if <see cref="Type"/> is 'PostNotFound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostNotFound'.</exception>
    public Peal.PostNotFoundEncoded AsPostNotFound() =>
        IsPostNotFound
            ? (Peal.PostNotFoundEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'PostNotFound'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.DuplicatePostEncoded"/> if <see cref="Type"/> is 'DuplicatePost', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'DuplicatePost'.</exception>
    public Peal.DuplicatePostEncoded AsDuplicatePost() =>
        IsDuplicatePost
            ? (Peal.DuplicatePostEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'DuplicatePost'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ForbiddenEncoded"/> if <see cref="Type"/> is 'Forbidden', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'Forbidden'.</exception>
    public Peal.ForbiddenEncoded AsForbidden() =>
        IsForbidden
            ? (Peal.ForbiddenEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'Forbidden'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.UnknownTagsEncoded"/> if <see cref="Type"/> is 'UnknownTags', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UnknownTags'.</exception>
    public Peal.UnknownTagsEncoded AsUnknownTags() =>
        IsUnknownTags
            ? (Peal.UnknownTagsEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'UnknownTags'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ChannelSetNotFoundEncoded"/> if <see cref="Type"/> is 'ChannelSetNotFound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelSetNotFound'.</exception>
    public Peal.ChannelSetNotFoundEncoded AsChannelSetNotFound() =>
        IsChannelSetNotFound
            ? (Peal.ChannelSetNotFoundEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'ChannelSetNotFound'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.SignatureNotFoundEncoded"/> if <see cref="Type"/> is 'SignatureNotFound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SignatureNotFound'.</exception>
    public Peal.SignatureNotFoundEncoded AsSignatureNotFound() =>
        IsSignatureNotFound
            ? (Peal.SignatureNotFoundEncoded)Value!
            : throw new global::System.Exception("PostRefusal.Type is not 'SignatureNotFound'");

    public T Match<T>(
        Func<Peal.PostContentInvalidEncoded, T> onPostContentInvalid,
        Func<Peal.UnknownChannelsEncoded, T> onUnknownChannels,
        Func<Peal.UnknownMediaEncoded, T> onUnknownMedia,
        Func<Peal.ScheduleInPastEncoded, T> onScheduleInPast,
        Func<Peal.InvalidTimeZoneEncoded, T> onInvalidTimeZone,
        Func<Peal.PlanLimitReachedEncoded, T> onPlanLimitReached,
        Func<Peal.IdempotencyKeyReusedEncoded, T> onIdempotencyKeyReused,
        Func<Peal.PostNotFoundEncoded, T> onPostNotFound,
        Func<Peal.DuplicatePostEncoded, T> onDuplicatePost,
        Func<Peal.ForbiddenEncoded, T> onForbidden,
        Func<Peal.UnknownTagsEncoded, T> onUnknownTags,
        Func<Peal.ChannelSetNotFoundEncoded, T> onChannelSetNotFound,
        Func<Peal.SignatureNotFoundEncoded, T> onSignatureNotFound,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "PostContentInvalid" => onPostContentInvalid(AsPostContentInvalid()),
            "UnknownChannels" => onUnknownChannels(AsUnknownChannels()),
            "UnknownMedia" => onUnknownMedia(AsUnknownMedia()),
            "ScheduleInPast" => onScheduleInPast(AsScheduleInPast()),
            "InvalidTimeZone" => onInvalidTimeZone(AsInvalidTimeZone()),
            "PlanLimitReached" => onPlanLimitReached(AsPlanLimitReached()),
            "IdempotencyKeyReused" => onIdempotencyKeyReused(AsIdempotencyKeyReused()),
            "PostNotFound" => onPostNotFound(AsPostNotFound()),
            "DuplicatePost" => onDuplicatePost(AsDuplicatePost()),
            "Forbidden" => onForbidden(AsForbidden()),
            "UnknownTags" => onUnknownTags(AsUnknownTags()),
            "ChannelSetNotFound" => onChannelSetNotFound(AsChannelSetNotFound()),
            "SignatureNotFound" => onSignatureNotFound(AsSignatureNotFound()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.PostContentInvalidEncoded> onPostContentInvalid,
        Action<Peal.UnknownChannelsEncoded> onUnknownChannels,
        Action<Peal.UnknownMediaEncoded> onUnknownMedia,
        Action<Peal.ScheduleInPastEncoded> onScheduleInPast,
        Action<Peal.InvalidTimeZoneEncoded> onInvalidTimeZone,
        Action<Peal.PlanLimitReachedEncoded> onPlanLimitReached,
        Action<Peal.IdempotencyKeyReusedEncoded> onIdempotencyKeyReused,
        Action<Peal.PostNotFoundEncoded> onPostNotFound,
        Action<Peal.DuplicatePostEncoded> onDuplicatePost,
        Action<Peal.ForbiddenEncoded> onForbidden,
        Action<Peal.UnknownTagsEncoded> onUnknownTags,
        Action<Peal.ChannelSetNotFoundEncoded> onChannelSetNotFound,
        Action<Peal.SignatureNotFoundEncoded> onSignatureNotFound,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "PostContentInvalid":
                onPostContentInvalid(AsPostContentInvalid());
                break;
            case "UnknownChannels":
                onUnknownChannels(AsUnknownChannels());
                break;
            case "UnknownMedia":
                onUnknownMedia(AsUnknownMedia());
                break;
            case "ScheduleInPast":
                onScheduleInPast(AsScheduleInPast());
                break;
            case "InvalidTimeZone":
                onInvalidTimeZone(AsInvalidTimeZone());
                break;
            case "PlanLimitReached":
                onPlanLimitReached(AsPlanLimitReached());
                break;
            case "IdempotencyKeyReused":
                onIdempotencyKeyReused(AsIdempotencyKeyReused());
                break;
            case "PostNotFound":
                onPostNotFound(AsPostNotFound());
                break;
            case "DuplicatePost":
                onDuplicatePost(AsDuplicatePost());
                break;
            case "Forbidden":
                onForbidden(AsForbidden());
                break;
            case "UnknownTags":
                onUnknownTags(AsUnknownTags());
                break;
            case "ChannelSetNotFound":
                onChannelSetNotFound(AsChannelSetNotFound());
                break;
            case "SignatureNotFound":
                onSignatureNotFound(AsSignatureNotFound());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostContentInvalidEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostContentInvalid(out Peal.PostContentInvalidEncoded? value)
    {
        if (Type == "PostContentInvalid")
        {
            value = (Peal.PostContentInvalidEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UnknownChannelsEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnknownChannels(out Peal.UnknownChannelsEncoded? value)
    {
        if (Type == "UnknownChannels")
        {
            value = (Peal.UnknownChannelsEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UnknownMediaEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnknownMedia(out Peal.UnknownMediaEncoded? value)
    {
        if (Type == "UnknownMedia")
        {
            value = (Peal.UnknownMediaEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ScheduleInPastEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsScheduleInPast(out Peal.ScheduleInPastEncoded? value)
    {
        if (Type == "ScheduleInPast")
        {
            value = (Peal.ScheduleInPastEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.InvalidTimeZoneEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsInvalidTimeZone(out Peal.InvalidTimeZoneEncoded? value)
    {
        if (Type == "InvalidTimeZone")
        {
            value = (Peal.InvalidTimeZoneEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PlanLimitReachedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPlanLimitReached(out Peal.PlanLimitReachedEncoded? value)
    {
        if (Type == "PlanLimitReached")
        {
            value = (Peal.PlanLimitReachedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.IdempotencyKeyReusedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsIdempotencyKeyReused(out Peal.IdempotencyKeyReusedEncoded? value)
    {
        if (Type == "IdempotencyKeyReused")
        {
            value = (Peal.IdempotencyKeyReusedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostNotFoundEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostNotFound(out Peal.PostNotFoundEncoded? value)
    {
        if (Type == "PostNotFound")
        {
            value = (Peal.PostNotFoundEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.DuplicatePostEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsDuplicatePost(out Peal.DuplicatePostEncoded? value)
    {
        if (Type == "DuplicatePost")
        {
            value = (Peal.DuplicatePostEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ForbiddenEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsForbidden(out Peal.ForbiddenEncoded? value)
    {
        if (Type == "Forbidden")
        {
            value = (Peal.ForbiddenEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UnknownTagsEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnknownTags(out Peal.UnknownTagsEncoded? value)
    {
        if (Type == "UnknownTags")
        {
            value = (Peal.UnknownTagsEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ChannelSetNotFoundEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelSetNotFound(out Peal.ChannelSetNotFoundEncoded? value)
    {
        if (Type == "ChannelSetNotFound")
        {
            value = (Peal.ChannelSetNotFoundEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.SignatureNotFoundEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsSignatureNotFound(out Peal.SignatureNotFoundEncoded? value)
    {
        if (Type == "SignatureNotFound")
        {
            value = (Peal.SignatureNotFoundEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator PostRefusal(PostRefusal.PostContentInvalid value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.UnknownChannels value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.UnknownMedia value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.ScheduleInPast value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.InvalidTimeZone value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.PlanLimitReached value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.IdempotencyKeyReused value) =>
        new(value);

    public static implicit operator PostRefusal(PostRefusal.PostNotFound value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.DuplicatePost value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.Forbidden value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.UnknownTags value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.ChannelSetNotFound value) => new(value);

    public static implicit operator PostRefusal(PostRefusal.SignatureNotFound value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<PostRefusal>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(PostRefusal).IsAssignableFrom(typeToConvert);

        public override PostRefusal Read(
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
                "PostContentInvalid" => json.Deserialize<Peal.PostContentInvalidEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.PostContentInvalidEncoded"
                    ),
                "UnknownChannels" => json.Deserialize<Peal.UnknownChannelsEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.UnknownChannelsEncoded"),
                "UnknownMedia" => jsonWithoutDiscriminator.Deserialize<Peal.UnknownMediaEncoded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.UnknownMediaEncoded"),
                "ScheduleInPast" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ScheduleInPastEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ScheduleInPastEncoded"
                        ),
                "InvalidTimeZone" => json.Deserialize<Peal.InvalidTimeZoneEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.InvalidTimeZoneEncoded"),
                "PlanLimitReached" => json.Deserialize<Peal.PlanLimitReachedEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.PlanLimitReachedEncoded"
                    ),
                "IdempotencyKeyReused" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.IdempotencyKeyReusedEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.IdempotencyKeyReusedEncoded"
                        ),
                "PostNotFound" => jsonWithoutDiscriminator.Deserialize<Peal.PostNotFoundEncoded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.PostNotFoundEncoded"),
                "DuplicatePost" => jsonWithoutDiscriminator.Deserialize<Peal.DuplicatePostEncoded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.DuplicatePostEncoded"),
                "Forbidden" => json.Deserialize<Peal.ForbiddenEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ForbiddenEncoded"),
                "UnknownTags" => json.Deserialize<Peal.UnknownTagsEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.UnknownTagsEncoded"),
                "ChannelSetNotFound" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ChannelSetNotFoundEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ChannelSetNotFoundEncoded"
                        ),
                "SignatureNotFound" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.SignatureNotFoundEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.SignatureNotFoundEncoded"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new PostRefusal(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostRefusal value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "PostContentInvalid" => JsonSerializer.SerializeToNode(value.Value, options),
                    "UnknownChannels" => JsonSerializer.SerializeToNode(value.Value, options),
                    "UnknownMedia" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ScheduleInPast" => JsonSerializer.SerializeToNode(value.Value, options),
                    "InvalidTimeZone" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PlanLimitReached" => JsonSerializer.SerializeToNode(value.Value, options),
                    "IdempotencyKeyReused" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostNotFound" => JsonSerializer.SerializeToNode(value.Value, options),
                    "DuplicatePost" => JsonSerializer.SerializeToNode(value.Value, options),
                    "Forbidden" => JsonSerializer.SerializeToNode(value.Value, options),
                    "UnknownTags" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ChannelSetNotFound" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SignatureNotFound" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override PostRefusal ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new PostRefusal(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for PostContentInvalid
    /// </summary>
    [Serializable]
    public struct PostContentInvalid
    {
        public PostContentInvalid(Peal.PostContentInvalidEncoded value)
        {
            Value = value;
        }

        internal Peal.PostContentInvalidEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.PostContentInvalid(
            Peal.PostContentInvalidEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for UnknownChannels
    /// </summary>
    [Serializable]
    public struct UnknownChannels
    {
        public UnknownChannels(Peal.UnknownChannelsEncoded value)
        {
            Value = value;
        }

        internal Peal.UnknownChannelsEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.UnknownChannels(
            Peal.UnknownChannelsEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for UnknownMedia
    /// </summary>
    [Serializable]
    public struct UnknownMedia
    {
        public UnknownMedia(Peal.UnknownMediaEncoded value)
        {
            Value = value;
        }

        internal Peal.UnknownMediaEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.UnknownMedia(Peal.UnknownMediaEncoded value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for ScheduleInPast
    /// </summary>
    [Serializable]
    public struct ScheduleInPast
    {
        public ScheduleInPast(Peal.ScheduleInPastEncoded value)
        {
            Value = value;
        }

        internal Peal.ScheduleInPastEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.ScheduleInPast(
            Peal.ScheduleInPastEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for InvalidTimeZone
    /// </summary>
    [Serializable]
    public struct InvalidTimeZone
    {
        public InvalidTimeZone(Peal.InvalidTimeZoneEncoded value)
        {
            Value = value;
        }

        internal Peal.InvalidTimeZoneEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.InvalidTimeZone(
            Peal.InvalidTimeZoneEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PlanLimitReached
    /// </summary>
    [Serializable]
    public struct PlanLimitReached
    {
        public PlanLimitReached(Peal.PlanLimitReachedEncoded value)
        {
            Value = value;
        }

        internal Peal.PlanLimitReachedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.PlanLimitReached(
            Peal.PlanLimitReachedEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for IdempotencyKeyReused
    /// </summary>
    [Serializable]
    public struct IdempotencyKeyReused
    {
        public IdempotencyKeyReused(Peal.IdempotencyKeyReusedEncoded value)
        {
            Value = value;
        }

        internal Peal.IdempotencyKeyReusedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.IdempotencyKeyReused(
            Peal.IdempotencyKeyReusedEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostNotFound
    /// </summary>
    [Serializable]
    public struct PostNotFound
    {
        public PostNotFound(Peal.PostNotFoundEncoded value)
        {
            Value = value;
        }

        internal Peal.PostNotFoundEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.PostNotFound(Peal.PostNotFoundEncoded value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for DuplicatePost
    /// </summary>
    [Serializable]
    public struct DuplicatePost
    {
        public DuplicatePost(Peal.DuplicatePostEncoded value)
        {
            Value = value;
        }

        internal Peal.DuplicatePostEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.DuplicatePost(
            Peal.DuplicatePostEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for Forbidden
    /// </summary>
    [Serializable]
    public struct Forbidden
    {
        public Forbidden(Peal.ForbiddenEncoded value)
        {
            Value = value;
        }

        internal Peal.ForbiddenEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.Forbidden(Peal.ForbiddenEncoded value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for UnknownTags
    /// </summary>
    [Serializable]
    public struct UnknownTags
    {
        public UnknownTags(Peal.UnknownTagsEncoded value)
        {
            Value = value;
        }

        internal Peal.UnknownTagsEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.UnknownTags(Peal.UnknownTagsEncoded value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelSetNotFound
    /// </summary>
    [Serializable]
    public struct ChannelSetNotFound
    {
        public ChannelSetNotFound(Peal.ChannelSetNotFoundEncoded value)
        {
            Value = value;
        }

        internal Peal.ChannelSetNotFoundEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.ChannelSetNotFound(
            Peal.ChannelSetNotFoundEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SignatureNotFound
    /// </summary>
    [Serializable]
    public struct SignatureNotFound
    {
        public SignatureNotFound(Peal.SignatureNotFoundEncoded value)
        {
            Value = value;
        }

        internal Peal.SignatureNotFoundEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostRefusal.SignatureNotFound(
            Peal.SignatureNotFoundEncoded value
        ) => new(value);
    }
}
