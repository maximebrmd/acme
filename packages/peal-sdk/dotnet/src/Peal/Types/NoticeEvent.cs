// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NoticeEvent.JsonConverter))]
[Serializable]
public record NoticeEvent
{
    internal NoticeEvent(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostPublished"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostPublished value)
    {
        Type = "PostPublished";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostFailed"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostFailed value)
    {
        Type = "PostFailed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostUnconfirmed"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostUnconfirmed value)
    {
        Type = "PostUnconfirmed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.ChannelReconnectRequired"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.ChannelReconnectRequired value)
    {
        Type = "ChannelReconnectRequired";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.ChannelReconnectSoon"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.ChannelReconnectSoon value)
    {
        Type = "ChannelReconnectSoon";
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
    /// Returns true if <see cref="Type"/> is "PostPublished"
    /// </summary>
    public bool IsPostPublished => Type == "PostPublished";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostFailed"
    /// </summary>
    public bool IsPostFailed => Type == "PostFailed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostUnconfirmed"
    /// </summary>
    public bool IsPostUnconfirmed => Type == "PostUnconfirmed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelReconnectRequired"
    /// </summary>
    public bool IsChannelReconnectRequired => Type == "ChannelReconnectRequired";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelReconnectSoon"
    /// </summary>
    public bool IsChannelReconnectSoon => Type == "ChannelReconnectSoon";

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostPublished"/> if <see cref="Type"/> is 'PostPublished', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostPublished'.</exception>
    public Peal.NoticeEventPostPublished AsPostPublished() =>
        IsPostPublished
            ? (Peal.NoticeEventPostPublished)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostPublished'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostFailed"/> if <see cref="Type"/> is 'PostFailed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostFailed'.</exception>
    public Peal.NoticeEventPostFailed AsPostFailed() =>
        IsPostFailed
            ? (Peal.NoticeEventPostFailed)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostFailed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostUnconfirmed"/> if <see cref="Type"/> is 'PostUnconfirmed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostUnconfirmed'.</exception>
    public Peal.NoticeEventPostUnconfirmed AsPostUnconfirmed() =>
        IsPostUnconfirmed
            ? (Peal.NoticeEventPostUnconfirmed)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostUnconfirmed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventChannelReconnectRequired"/> if <see cref="Type"/> is 'ChannelReconnectRequired', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelReconnectRequired'.</exception>
    public Peal.NoticeEventChannelReconnectRequired AsChannelReconnectRequired() =>
        IsChannelReconnectRequired
            ? (Peal.NoticeEventChannelReconnectRequired)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'ChannelReconnectRequired'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventChannelReconnectSoon"/> if <see cref="Type"/> is 'ChannelReconnectSoon', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelReconnectSoon'.</exception>
    public Peal.NoticeEventChannelReconnectSoon AsChannelReconnectSoon() =>
        IsChannelReconnectSoon
            ? (Peal.NoticeEventChannelReconnectSoon)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'ChannelReconnectSoon'");

    public T Match<T>(
        Func<Peal.NoticeEventPostPublished, T> onPostPublished,
        Func<Peal.NoticeEventPostFailed, T> onPostFailed,
        Func<Peal.NoticeEventPostUnconfirmed, T> onPostUnconfirmed,
        Func<Peal.NoticeEventChannelReconnectRequired, T> onChannelReconnectRequired,
        Func<Peal.NoticeEventChannelReconnectSoon, T> onChannelReconnectSoon,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "PostPublished" => onPostPublished(AsPostPublished()),
            "PostFailed" => onPostFailed(AsPostFailed()),
            "PostUnconfirmed" => onPostUnconfirmed(AsPostUnconfirmed()),
            "ChannelReconnectRequired" => onChannelReconnectRequired(AsChannelReconnectRequired()),
            "ChannelReconnectSoon" => onChannelReconnectSoon(AsChannelReconnectSoon()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.NoticeEventPostPublished> onPostPublished,
        Action<Peal.NoticeEventPostFailed> onPostFailed,
        Action<Peal.NoticeEventPostUnconfirmed> onPostUnconfirmed,
        Action<Peal.NoticeEventChannelReconnectRequired> onChannelReconnectRequired,
        Action<Peal.NoticeEventChannelReconnectSoon> onChannelReconnectSoon,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "PostPublished":
                onPostPublished(AsPostPublished());
                break;
            case "PostFailed":
                onPostFailed(AsPostFailed());
                break;
            case "PostUnconfirmed":
                onPostUnconfirmed(AsPostUnconfirmed());
                break;
            case "ChannelReconnectRequired":
                onChannelReconnectRequired(AsChannelReconnectRequired());
                break;
            case "ChannelReconnectSoon":
                onChannelReconnectSoon(AsChannelReconnectSoon());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostPublished"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostPublished(out Peal.NoticeEventPostPublished? value)
    {
        if (Type == "PostPublished")
        {
            value = (Peal.NoticeEventPostPublished)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostFailed"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostFailed(out Peal.NoticeEventPostFailed? value)
    {
        if (Type == "PostFailed")
        {
            value = (Peal.NoticeEventPostFailed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostUnconfirmed"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostUnconfirmed(out Peal.NoticeEventPostUnconfirmed? value)
    {
        if (Type == "PostUnconfirmed")
        {
            value = (Peal.NoticeEventPostUnconfirmed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventChannelReconnectRequired"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelReconnectRequired(out Peal.NoticeEventChannelReconnectRequired? value)
    {
        if (Type == "ChannelReconnectRequired")
        {
            value = (Peal.NoticeEventChannelReconnectRequired)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventChannelReconnectSoon"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelReconnectSoon(out Peal.NoticeEventChannelReconnectSoon? value)
    {
        if (Type == "ChannelReconnectSoon")
        {
            value = (Peal.NoticeEventChannelReconnectSoon)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator NoticeEvent(NoticeEvent.PostPublished value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostFailed value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostUnconfirmed value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.ChannelReconnectRequired value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.ChannelReconnectSoon value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<NoticeEvent>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(NoticeEvent).IsAssignableFrom(typeToConvert);

        public override NoticeEvent Read(
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
                "PostPublished" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostPublished?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostPublished"
                        ),
                "PostFailed" => jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostFailed?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.NoticeEventPostFailed"),
                "PostUnconfirmed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostUnconfirmed?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostUnconfirmed"
                        ),
                "ChannelReconnectRequired" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventChannelReconnectRequired?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventChannelReconnectRequired"
                        ),
                "ChannelReconnectSoon" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventChannelReconnectSoon?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventChannelReconnectSoon"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new NoticeEvent(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NoticeEvent value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "PostPublished" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostFailed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostUnconfirmed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ChannelReconnectRequired" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "ChannelReconnectSoon" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override NoticeEvent ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new NoticeEvent(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NoticeEvent value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for PostPublished
    /// </summary>
    [Serializable]
    public struct PostPublished
    {
        public PostPublished(Peal.NoticeEventPostPublished value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostPublished Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostPublished(
            Peal.NoticeEventPostPublished value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostFailed
    /// </summary>
    [Serializable]
    public struct PostFailed
    {
        public PostFailed(Peal.NoticeEventPostFailed value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostFailed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostFailed(Peal.NoticeEventPostFailed value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for PostUnconfirmed
    /// </summary>
    [Serializable]
    public struct PostUnconfirmed
    {
        public PostUnconfirmed(Peal.NoticeEventPostUnconfirmed value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostUnconfirmed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostUnconfirmed(
            Peal.NoticeEventPostUnconfirmed value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelReconnectRequired
    /// </summary>
    [Serializable]
    public struct ChannelReconnectRequired
    {
        public ChannelReconnectRequired(Peal.NoticeEventChannelReconnectRequired value)
        {
            Value = value;
        }

        internal Peal.NoticeEventChannelReconnectRequired Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.ChannelReconnectRequired(
            Peal.NoticeEventChannelReconnectRequired value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelReconnectSoon
    /// </summary>
    [Serializable]
    public struct ChannelReconnectSoon
    {
        public ChannelReconnectSoon(Peal.NoticeEventChannelReconnectSoon value)
        {
            Value = value;
        }

        internal Peal.NoticeEventChannelReconnectSoon Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.ChannelReconnectSoon(
            Peal.NoticeEventChannelReconnectSoon value
        ) => new(value);
    }
}
