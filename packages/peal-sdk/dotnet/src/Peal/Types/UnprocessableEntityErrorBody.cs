// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UnprocessableEntityErrorBody.JsonConverter))]
[Serializable]
public record UnprocessableEntityErrorBody
{
    internal UnprocessableEntityErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.UnsupportedMediaType"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.UnsupportedMediaType value)
    {
        Type = "UnsupportedMediaType";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.MediaTooLarge"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.MediaTooLarge value)
    {
        Type = "MediaTooLarge";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.AltTextTooLong"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.AltTextTooLong value)
    {
        Type = "AltTextTooLong";
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
    /// Returns true if <see cref="Type"/> is "UnsupportedMediaType"
    /// </summary>
    public bool IsUnsupportedMediaType => Type == "UnsupportedMediaType";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "MediaTooLarge"
    /// </summary>
    public bool IsMediaTooLarge => Type == "MediaTooLarge";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "AltTextTooLong"
    /// </summary>
    public bool IsAltTextTooLong => Type == "AltTextTooLong";

    /// <summary>
    /// Returns the value as a <see cref="Peal.UnsupportedMediaTypeEncoded"/> if <see cref="Type"/> is 'UnsupportedMediaType', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UnsupportedMediaType'.</exception>
    public Peal.UnsupportedMediaTypeEncoded AsUnsupportedMediaType() =>
        IsUnsupportedMediaType
            ? (Peal.UnsupportedMediaTypeEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'UnsupportedMediaType'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.MediaTooLargeEncoded"/> if <see cref="Type"/> is 'MediaTooLarge', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'MediaTooLarge'.</exception>
    public Peal.MediaTooLargeEncoded AsMediaTooLarge() =>
        IsMediaTooLarge
            ? (Peal.MediaTooLargeEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'MediaTooLarge'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.AltTextTooLongEncoded"/> if <see cref="Type"/> is 'AltTextTooLong', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'AltTextTooLong'.</exception>
    public Peal.AltTextTooLongEncoded AsAltTextTooLong() =>
        IsAltTextTooLong
            ? (Peal.AltTextTooLongEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'AltTextTooLong'"
            );

    public T Match<T>(
        Func<Peal.UnsupportedMediaTypeEncoded, T> onUnsupportedMediaType,
        Func<Peal.MediaTooLargeEncoded, T> onMediaTooLarge,
        Func<Peal.AltTextTooLongEncoded, T> onAltTextTooLong,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "UnsupportedMediaType" => onUnsupportedMediaType(AsUnsupportedMediaType()),
            "MediaTooLarge" => onMediaTooLarge(AsMediaTooLarge()),
            "AltTextTooLong" => onAltTextTooLong(AsAltTextTooLong()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.UnsupportedMediaTypeEncoded> onUnsupportedMediaType,
        Action<Peal.MediaTooLargeEncoded> onMediaTooLarge,
        Action<Peal.AltTextTooLongEncoded> onAltTextTooLong,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "UnsupportedMediaType":
                onUnsupportedMediaType(AsUnsupportedMediaType());
                break;
            case "MediaTooLarge":
                onMediaTooLarge(AsMediaTooLarge());
                break;
            case "AltTextTooLong":
                onAltTextTooLong(AsAltTextTooLong());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UnsupportedMediaTypeEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnsupportedMediaType(out Peal.UnsupportedMediaTypeEncoded? value)
    {
        if (Type == "UnsupportedMediaType")
        {
            value = (Peal.UnsupportedMediaTypeEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MediaTooLargeEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaTooLarge(out Peal.MediaTooLargeEncoded? value)
    {
        if (Type == "MediaTooLarge")
        {
            value = (Peal.MediaTooLargeEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AltTextTooLongEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsAltTextTooLong(out Peal.AltTextTooLongEncoded? value)
    {
        if (Type == "AltTextTooLong")
        {
            value = (Peal.AltTextTooLongEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.UnsupportedMediaType value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.MediaTooLarge value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.AltTextTooLong value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<UnprocessableEntityErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(UnprocessableEntityErrorBody).IsAssignableFrom(typeToConvert);

        public override UnprocessableEntityErrorBody Read(
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
                "UnsupportedMediaType" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.UnsupportedMediaTypeEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.UnsupportedMediaTypeEncoded"
                        ),
                "MediaTooLarge" => jsonWithoutDiscriminator.Deserialize<Peal.MediaTooLargeEncoded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.MediaTooLargeEncoded"),
                "AltTextTooLong" => json.Deserialize<Peal.AltTextTooLongEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.AltTextTooLongEncoded"),
                _ => json.Deserialize<object?>(options),
            };
            return new UnprocessableEntityErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UnprocessableEntityErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "UnsupportedMediaType" => JsonSerializer.SerializeToNode(value.Value, options),
                    "MediaTooLarge" => JsonSerializer.SerializeToNode(value.Value, options),
                    "AltTextTooLong" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override UnprocessableEntityErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new UnprocessableEntityErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UnprocessableEntityErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for UnsupportedMediaType
    /// </summary>
    [Serializable]
    public struct UnsupportedMediaType
    {
        public UnsupportedMediaType(Peal.UnsupportedMediaTypeEncoded value)
        {
            Value = value;
        }

        internal Peal.UnsupportedMediaTypeEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.UnsupportedMediaType(
            Peal.UnsupportedMediaTypeEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for MediaTooLarge
    /// </summary>
    [Serializable]
    public struct MediaTooLarge
    {
        public MediaTooLarge(Peal.MediaTooLargeEncoded value)
        {
            Value = value;
        }

        internal Peal.MediaTooLargeEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.MediaTooLarge(
            Peal.MediaTooLargeEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for AltTextTooLong
    /// </summary>
    [Serializable]
    public struct AltTextTooLong
    {
        public AltTextTooLong(Peal.AltTextTooLongEncoded value)
        {
            Value = value;
        }

        internal Peal.AltTextTooLongEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.AltTextTooLong(
            Peal.AltTextTooLongEncoded value
        ) => new(value);
    }
}
