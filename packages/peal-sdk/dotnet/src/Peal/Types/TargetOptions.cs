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

    public T Match<T>(
        Func<Peal.YouTubeOptions, T> onYoutube,
        Func<Peal.TikTokOptions, T> onTiktok,
        Func<Peal.PinterestOptions, T> onPinterest,
        Func<string, object?, T> onUnknown_
    )
    {
        return Platform switch
        {
            "youtube" => onYoutube(AsYoutube()),
            "tiktok" => onTiktok(AsTiktok()),
            "pinterest" => onPinterest(AsPinterest()),
            _ => onUnknown_(Platform, Value),
        };
    }

    public void Visit(
        Action<Peal.YouTubeOptions> onYoutube,
        Action<Peal.TikTokOptions> onTiktok,
        Action<Peal.PinterestOptions> onPinterest,
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

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator TargetOptions(TargetOptions.Youtube value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Tiktok value) => new(value);

    public static implicit operator TargetOptions(TargetOptions.Pinterest value) => new(value);

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
}
