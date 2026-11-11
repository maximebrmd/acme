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
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.UnknownChannels"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.UnknownChannels value)
    {
        Type = "UnknownChannels";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.InvalidTimeZone"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.InvalidTimeZone value)
    {
        Type = "InvalidTimeZone";
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
    /// Returns true if <see cref="Type"/> is "UnknownChannels"
    /// </summary>
    public bool IsUnknownChannels => Type == "UnknownChannels";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "InvalidTimeZone"
    /// </summary>
    public bool IsInvalidTimeZone => Type == "InvalidTimeZone";

    /// <summary>
    /// Returns the value as a <see cref="Peal.UnknownChannelsEncoded"/> if <see cref="Type"/> is 'UnknownChannels', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UnknownChannels'.</exception>
    public Peal.UnknownChannelsEncoded AsUnknownChannels() =>
        IsUnknownChannels
            ? (Peal.UnknownChannelsEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'UnknownChannels'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.InvalidTimeZoneEncoded"/> if <see cref="Type"/> is 'InvalidTimeZone', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'InvalidTimeZone'.</exception>
    public Peal.InvalidTimeZoneEncoded AsInvalidTimeZone() =>
        IsInvalidTimeZone
            ? (Peal.InvalidTimeZoneEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'InvalidTimeZone'"
            );

    public T Match<T>(
        Func<Peal.UnknownChannelsEncoded, T> onUnknownChannels,
        Func<Peal.InvalidTimeZoneEncoded, T> onInvalidTimeZone,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "UnknownChannels" => onUnknownChannels(AsUnknownChannels()),
            "InvalidTimeZone" => onInvalidTimeZone(AsInvalidTimeZone()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.UnknownChannelsEncoded> onUnknownChannels,
        Action<Peal.InvalidTimeZoneEncoded> onInvalidTimeZone,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "UnknownChannels":
                onUnknownChannels(AsUnknownChannels());
                break;
            case "InvalidTimeZone":
                onInvalidTimeZone(AsInvalidTimeZone());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
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

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.UnknownChannels value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.InvalidTimeZone value
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

            var value = discriminator switch
            {
                "UnknownChannels" => json.Deserialize<Peal.UnknownChannelsEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.UnknownChannelsEncoded"),
                "InvalidTimeZone" => json.Deserialize<Peal.InvalidTimeZoneEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.InvalidTimeZoneEncoded"),
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
                    "UnknownChannels" => JsonSerializer.SerializeToNode(value.Value, options),
                    "InvalidTimeZone" => JsonSerializer.SerializeToNode(value.Value, options),
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

        public static implicit operator UnprocessableEntityErrorBody.UnknownChannels(
            Peal.UnknownChannelsEncoded value
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

        public static implicit operator UnprocessableEntityErrorBody.InvalidTimeZone(
            Peal.InvalidTimeZoneEncoded value
        ) => new(value);
    }
}
