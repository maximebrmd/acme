// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

/// <summary>
/// What a post says on a channel that only its platform knows, tagged by `platform`. Platforms without options take none.
/// </summary>
[JsonConverter(typeof(TargetOptions.JsonConverter))]
[Serializable]
public record TargetOptions
{
    internal TargetOptions(string type, object? value)
    {
        Platform = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Youtube"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Youtube value)
    {
        Platform = "youtube";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Tiktok"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Tiktok value)
    {
        Platform = "tiktok";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Pinterest"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Pinterest value)
    {
        Platform = "pinterest";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.GoogleBusiness"/>.
    /// </summary>
    public TargetOptions(TargetOptions.GoogleBusiness value)
    {
        Platform = "googleBusiness";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Linkedin"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Linkedin value)
    {
        Platform = "linkedin";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Mastodon"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Mastodon value)
    {
        Platform = "mastodon";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Bluesky"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Bluesky value)
    {
        Platform = "bluesky";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Threads"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Threads value)
    {
        Platform = "threads";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.X"/>.
    /// </summary>
    public TargetOptions(TargetOptions.X value)
    {
        Platform = "x";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Instagram"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Instagram value)
    {
        Platform = "instagram";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetOptions with <see cref="TargetOptions.Facebook"/>.
    /// </summary>
    public TargetOptions(TargetOptions.Facebook value)
    {
        Platform = "facebook";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("platform")]
    public string Platform { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "youtube"
    /// </summary>
    public bool IsYoutube => Platform == "youtube";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "tiktok"
    /// </summary>
    public bool IsTiktok => Platform == "tiktok";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "pinterest"
    /// </summary>
    public bool IsPinterest => Platform == "pinterest";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "googleBusiness"
    /// </summary>
    public bool IsGoogleBusiness => Platform == "googleBusiness";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "linkedin"
    /// </summary>
    public bool IsLinkedin => Platform == "linkedin";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "mastodon"
    /// </summary>
    public bool IsMastodon => Platform == "mastodon";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "bluesky"
    /// </summary>
    public bool IsBluesky => Platform == "bluesky";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "threads"
    /// </summary>
    public bool IsThreads => Platform == "threads";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "x"
    /// </summary>
    public bool IsX => Platform == "x";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "instagram"
    /// </summary>
    public bool IsInstagram => Platform == "instagram";

    /// <summary>
    /// Returns true if <see cref="Platform"/> is "facebook"
    /// </summary>
    public bool IsFacebook => Platform == "facebook";

    /// <summary>
    /// Returns the value as a <see cref="Peal.YouTubeOptions"/> if <see cref="Platform"/> is 'youtube', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'youtube'.</exception>
    public Peal.YouTubeOptions AsYoutube() =>
        IsYoutube
            ? (Peal.YouTubeOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'youtube'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.TikTokOptions"/> if <see cref="Platform"/> is 'tiktok', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'tiktok'.</exception>
    public Peal.TikTokOptions AsTiktok() =>
        IsTiktok
            ? (Peal.TikTokOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'tiktok'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PinterestOptions"/> if <see cref="Platform"/> is 'pinterest', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'pinterest'.</exception>
    public Peal.PinterestOptions AsPinterest() =>
        IsPinterest
            ? (Peal.PinterestOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'pinterest'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.GoogleBusinessOptions"/> if <see cref="Platform"/> is 'googleBusiness', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'googleBusiness'.</exception>
    public Peal.GoogleBusinessOptions AsGoogleBusiness() =>
        IsGoogleBusiness
            ? (Peal.GoogleBusinessOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'googleBusiness'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.LinkedInOptions"/> if <see cref="Platform"/> is 'linkedin', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'linkedin'.</exception>
    public Peal.LinkedInOptions AsLinkedin() =>
        IsLinkedin
            ? (Peal.LinkedInOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'linkedin'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.MastodonOptions"/> if <see cref="Platform"/> is 'mastodon', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'mastodon'.</exception>
    public Peal.MastodonOptions AsMastodon() =>
        IsMastodon
            ? (Peal.MastodonOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'mastodon'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.BlueskyOptions"/> if <see cref="Platform"/> is 'bluesky', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'bluesky'.</exception>
    public Peal.BlueskyOptions AsBluesky() =>
        IsBluesky
            ? (Peal.BlueskyOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'bluesky'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ThreadsOptions"/> if <see cref="Platform"/> is 'threads', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'threads'.</exception>
    public Peal.ThreadsOptions AsThreads() =>
        IsThreads
            ? (Peal.ThreadsOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'threads'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.XOptions"/> if <see cref="Platform"/> is 'x', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'x'.</exception>
    public Peal.XOptions AsX() =>
        IsX
            ? (Peal.XOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'x'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.InstagramOptions"/> if <see cref="Platform"/> is 'instagram', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'instagram'.</exception>
    public Peal.InstagramOptions AsInstagram() =>
        IsInstagram
            ? (Peal.InstagramOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'instagram'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.FacebookOptions"/> if <see cref="Platform"/> is 'facebook', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Platform"/> is not 'facebook'.</exception>
    public Peal.FacebookOptions AsFacebook() =>
        IsFacebook
            ? (Peal.FacebookOptions)Value!
            : throw new global::System.Exception("TargetOptions.Platform is not 'facebook'");

    public T Match<T>(
        Func<Peal.YouTubeOptions, T> onYoutube,
        Func<Peal.TikTokOptions, T> onTiktok,
        Func<Peal.PinterestOptions, T> onPinterest,
        Func<Peal.GoogleBusinessOptions, T> onGoogleBusiness,
        Func<Peal.LinkedInOptions, T> onLinkedin,
        Func<Peal.MastodonOptions, T> onMastodon,
        Func<Peal.BlueskyOptions, T> onBluesky,
        Func<Peal.ThreadsOptions, T> onThreads,
        Func<Peal.XOptions, T> onX,
        Func<Peal.InstagramOptions, T> onInstagram,
        Func<Peal.FacebookOptions, T> onFacebook,
        Func<string, object?, T> onUnknown_
    )
    {
        return Platform switch
        {
            "youtube" => onYoutube(AsYoutube()),
            "tiktok" => onTiktok(AsTiktok()),
            "pinterest" => onPinterest(AsPinterest()),
            "googleBusiness" => onGoogleBusiness(AsGoogleBusiness()),
            "linkedin" => onLinkedin(AsLinkedin()),
            "mastodon" => onMastodon(AsMastodon()),
            "bluesky" => onBluesky(AsBluesky()),
            "threads" => onThreads(AsThreads()),
            "x" => onX(AsX()),
            "instagram" => onInstagram(AsInstagram()),
            "facebook" => onFacebook(AsFacebook()),
            _ => onUnknown_(Platform, Value),
        };
    }

    public void Visit(
        Action<Peal.YouTubeOptions> onYoutube,
        Action<Peal.TikTokOptions> onTiktok,
        Action<Peal.PinterestOptions> onPinterest,
        Action<Peal.GoogleBusinessOptions> onGoogleBusiness,
        Action<Peal.LinkedInOptions> onLinkedin,
        Action<Peal.MastodonOptions> onMastodon,
        Action<Peal.BlueskyOptions> onBluesky,
        Action<Peal.ThreadsOptions> onThreads,
        Action<Peal.XOptions> onX,
        Action<Peal.InstagramOptions> onInstagram,
        Action<Peal.FacebookOptions> onFacebook,
        Action<string, object?> onUnknown_
    )
    {
        switch (Platform)
        {
            case "youtube":
                onYoutube(AsYoutube());
                break;
            case "tiktok":
                onTiktok(AsTiktok());
                break;
            case "pinterest":
                onPinterest(AsPinterest());
                break;
            case "googleBusiness":
                onGoogleBusiness(AsGoogleBusiness());
                break;
            case "linkedin":
                onLinkedin(AsLinkedin());
                break;
            case "mastodon":
                onMastodon(AsMastodon());
                break;
            case "bluesky":
                onBluesky(AsBluesky());
                break;
            case "threads":
                onThreads(AsThreads());
                break;
            case "x":
                onX(AsX());
                break;
            case "instagram":
                onInstagram(AsInstagram());
                break;
            case "facebook":
                onFacebook(AsFacebook());
                break;
            default:
                onUnknown_(Platform, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.YouTubeOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsYoutube(out Peal.YouTubeOptions? value)
    {
        if (Platform == "youtube")
        {
            value = (Peal.YouTubeOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TikTokOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsTiktok(out Peal.TikTokOptions? value)
    {
        if (Platform == "tiktok")
        {
            value = (Peal.TikTokOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PinterestOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsPinterest(out Peal.PinterestOptions? value)
    {
        if (Platform == "pinterest")
        {
            value = (Peal.PinterestOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.GoogleBusinessOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsGoogleBusiness(out Peal.GoogleBusinessOptions? value)
    {
        if (Platform == "googleBusiness")
        {
            value = (Peal.GoogleBusinessOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LinkedInOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsLinkedin(out Peal.LinkedInOptions? value)
    {
        if (Platform == "linkedin")
        {
            value = (Peal.LinkedInOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MastodonOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsMastodon(out Peal.MastodonOptions? value)
    {
        if (Platform == "mastodon")
        {
            value = (Peal.MastodonOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.BlueskyOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsBluesky(out Peal.BlueskyOptions? value)
    {
        if (Platform == "bluesky")
        {
            value = (Peal.BlueskyOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ThreadsOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsThreads(out Peal.ThreadsOptions? value)
    {
        if (Platform == "threads")
        {
            value = (Peal.ThreadsOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.XOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsX(out Peal.XOptions? value)
    {
        if (Platform == "x")
        {
            value = (Peal.XOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.InstagramOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsInstagram(out Peal.InstagramOptions? value)
    {
        if (Platform == "instagram")
        {
            value = (Peal.InstagramOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.FacebookOptions"/> and returns true if successful.
    /// </summary>
    public bool TryAsFacebook(out Peal.FacebookOptions? value)
    {
        if (Platform == "facebook")
        {
            value = (Peal.FacebookOptions)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator TargetOptions(TargetOptions.Youtube value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Tiktok value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Pinterest value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.GoogleBusiness value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Linkedin value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Mastodon value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Bluesky value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Threads value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.X value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Instagram value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Facebook value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<TargetOptions>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(TargetOptions).IsAssignableFrom(typeToConvert);

        public override TargetOptions Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("platform", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property 'platform'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property 'platform' is null");
                }

                throw new JsonException(
                    $"Discriminator property 'platform' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property 'platform' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("platform");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "youtube" => jsonWithoutDiscriminator.Deserialize<Peal.YouTubeOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.YouTubeOptions"),
                "tiktok" => jsonWithoutDiscriminator.Deserialize<Peal.TikTokOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.TikTokOptions"),
                "pinterest" => jsonWithoutDiscriminator.Deserialize<Peal.PinterestOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.PinterestOptions"),
                "googleBusiness" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.GoogleBusinessOptions?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.GoogleBusinessOptions"
                        ),
                "linkedin" => jsonWithoutDiscriminator.Deserialize<Peal.LinkedInOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.LinkedInOptions"),
                "mastodon" => jsonWithoutDiscriminator.Deserialize<Peal.MastodonOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.MastodonOptions"),
                "bluesky" => jsonWithoutDiscriminator.Deserialize<Peal.BlueskyOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.BlueskyOptions"),
                "threads" => jsonWithoutDiscriminator.Deserialize<Peal.ThreadsOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ThreadsOptions"),
                "x" => jsonWithoutDiscriminator.Deserialize<Peal.XOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.XOptions"),
                "instagram" => jsonWithoutDiscriminator.Deserialize<Peal.InstagramOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.InstagramOptions"),
                "facebook" => jsonWithoutDiscriminator.Deserialize<Peal.FacebookOptions?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.FacebookOptions"),
                _ => json.Deserialize<object?>(options),
            };
            return new TargetOptions(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TargetOptions value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Platform switch
                {
                    "youtube" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tiktok" => JsonSerializer.SerializeToNode(value.Value, options),
                    "pinterest" => JsonSerializer.SerializeToNode(value.Value, options),
                    "googleBusiness" => JsonSerializer.SerializeToNode(value.Value, options),
                    "linkedin" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mastodon" => JsonSerializer.SerializeToNode(value.Value, options),
                    "bluesky" => JsonSerializer.SerializeToNode(value.Value, options),
                    "threads" => JsonSerializer.SerializeToNode(value.Value, options),
                    "x" => JsonSerializer.SerializeToNode(value.Value, options),
                    "instagram" => JsonSerializer.SerializeToNode(value.Value, options),
                    "facebook" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["platform"] = value.Platform;
            json.WriteTo(writer, options);
        }

        public override TargetOptions ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new TargetOptions(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TargetOptions value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Platform);
        }
    }

    /// <summary>
    /// Discriminated union type for youtube
    /// </summary>
    [Serializable]
    public struct Youtube
    {
        public Youtube(Peal.YouTubeOptions value)
        {
            Value = value;
        }

        internal Peal.YouTubeOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Youtube(Peal.YouTubeOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for tiktok
    /// </summary>
    [Serializable]
    public struct Tiktok
    {
        public Tiktok(Peal.TikTokOptions value)
        {
            Value = value;
        }

        internal Peal.TikTokOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Tiktok(Peal.TikTokOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for pinterest
    /// </summary>
    [Serializable]
    public struct Pinterest
    {
        public Pinterest(Peal.PinterestOptions value)
        {
            Value = value;
        }

        internal Peal.PinterestOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Pinterest(Peal.PinterestOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for googleBusiness
    /// </summary>
    [Serializable]
    public struct GoogleBusiness
    {
        public GoogleBusiness(Peal.GoogleBusinessOptions value)
        {
            Value = value;
        }

        internal Peal.GoogleBusinessOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.GoogleBusiness(
            Peal.GoogleBusinessOptions value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for linkedin
    /// </summary>
    [Serializable]
    public struct Linkedin
    {
        public Linkedin(Peal.LinkedInOptions value)
        {
            Value = value;
        }

        internal Peal.LinkedInOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Linkedin(Peal.LinkedInOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for mastodon
    /// </summary>
    [Serializable]
    public struct Mastodon
    {
        public Mastodon(Peal.MastodonOptions value)
        {
            Value = value;
        }

        internal Peal.MastodonOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Mastodon(Peal.MastodonOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for bluesky
    /// </summary>
    [Serializable]
    public struct Bluesky
    {
        public Bluesky(Peal.BlueskyOptions value)
        {
            Value = value;
        }

        internal Peal.BlueskyOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Bluesky(Peal.BlueskyOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for threads
    /// </summary>
    [Serializable]
    public struct Threads
    {
        public Threads(Peal.ThreadsOptions value)
        {
            Value = value;
        }

        internal Peal.ThreadsOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Threads(Peal.ThreadsOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for x
    /// </summary>
    [Serializable]
    public struct X
    {
        public X(Peal.XOptions value)
        {
            Value = value;
        }

        internal Peal.XOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.X(Peal.XOptions value) => new(value);
    }

    /// <summary>
    /// Discriminated union type for instagram
    /// </summary>
    [Serializable]
    public struct Instagram
    {
        public Instagram(Peal.InstagramOptions value)
        {
            Value = value;
        }

        internal Peal.InstagramOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Instagram(Peal.InstagramOptions value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for facebook
    /// </summary>
    [Serializable]
    public struct Facebook
    {
        public Facebook(Peal.FacebookOptions value)
        {
            Value = value;
        }

        internal Peal.FacebookOptions Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetOptions.Facebook(Peal.FacebookOptions value) =>
            new(value);
    }
}
