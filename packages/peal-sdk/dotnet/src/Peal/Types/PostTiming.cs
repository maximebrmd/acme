// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostTiming.JsonConverter))]
[Serializable]
public record PostTiming
{
    internal PostTiming(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of PostTiming with <see cref="PostTiming.Now"/>.
    /// </summary>
    public PostTiming(PostTiming.Now value)
    {
        Type = "now";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostTiming with <see cref="PostTiming.At"/>.
    /// </summary>
    public PostTiming(PostTiming.At value)
    {
        Type = "at";
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
    /// Returns true if <see cref="Type"/> is "now"
    /// </summary>
    public bool IsNow => Type == "now";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "at"
    /// </summary>
    public bool IsAt => Type == "at";

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostTimingNow"/> if <see cref="Type"/> is 'now', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'now'.</exception>
    public Peal.PostTimingNow AsNow() =>
        IsNow
            ? (Peal.PostTimingNow)Value!
            : throw new global::System.Exception("PostTiming.Type is not 'now'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostTimingAt"/> if <see cref="Type"/> is 'at', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'at'.</exception>
    public Peal.PostTimingAt AsAt() =>
        IsAt
            ? (Peal.PostTimingAt)Value!
            : throw new global::System.Exception("PostTiming.Type is not 'at'");

    public T Match<T>(
        Func<Peal.PostTimingNow, T> onNow,
        Func<Peal.PostTimingAt, T> onAt,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "now" => onNow(AsNow()),
            "at" => onAt(AsAt()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.PostTimingNow> onNow,
        Action<Peal.PostTimingAt> onAt,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "now":
                onNow(AsNow());
                break;
            case "at":
                onAt(AsAt());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostTimingNow"/> and returns true if successful.
    /// </summary>
    public bool TryAsNow(out Peal.PostTimingNow? value)
    {
        if (Type == "now")
        {
            value = (Peal.PostTimingNow)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostTimingAt"/> and returns true if successful.
    /// </summary>
    public bool TryAsAt(out Peal.PostTimingAt? value)
    {
        if (Type == "at")
        {
            value = (Peal.PostTimingAt)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator PostTiming(PostTiming.Now value) => new(value);

    public static implicit operator PostTiming(PostTiming.At value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<PostTiming>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(PostTiming).IsAssignableFrom(typeToConvert);

        public override PostTiming Read(
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
                "now" => jsonWithoutDiscriminator.Deserialize<Peal.PostTimingNow?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.PostTimingNow"),
                "at" => jsonWithoutDiscriminator.Deserialize<Peal.PostTimingAt?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.PostTimingAt"),
                _ => json.Deserialize<object?>(options),
            };
            return new PostTiming(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostTiming value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "now" => JsonSerializer.SerializeToNode(value.Value, options),
                    "at" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override PostTiming ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new PostTiming(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostTiming value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for now
    /// </summary>
    [Serializable]
    public struct Now
    {
        public Now(Peal.PostTimingNow value)
        {
            Value = value;
        }

        internal Peal.PostTimingNow Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostTiming.Now(Peal.PostTimingNow value) => new(value);
    }

    /// <summary>
    /// Discriminated union type for at
    /// </summary>
    [Serializable]
    public struct At
    {
        public At(Peal.PostTimingAt value)
        {
            Value = value;
        }

        internal Peal.PostTimingAt Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostTiming.At(Peal.PostTimingAt value) => new(value);
    }
}
