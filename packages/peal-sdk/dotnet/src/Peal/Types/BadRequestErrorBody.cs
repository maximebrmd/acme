// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BadRequestErrorBody.JsonConverter))]
[Serializable]
public record BadRequestErrorBody
{
    internal BadRequestErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of BadRequestErrorBody with <see cref="BadRequestErrorBody.InvalidTimeRange"/>.
    /// </summary>
    public BadRequestErrorBody(BadRequestErrorBody.InvalidTimeRange value)
    {
        Type = "InvalidTimeRange";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of BadRequestErrorBody with <see cref="BadRequestErrorBody.BadRequest"/>.
    /// </summary>
    public BadRequestErrorBody(BadRequestErrorBody.BadRequest value)
    {
        Type = "BadRequest";
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
    /// Returns true if <see cref="Type"/> is "InvalidTimeRange"
    /// </summary>
    public bool IsInvalidTimeRange => Type == "InvalidTimeRange";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "BadRequest"
    /// </summary>
    public bool IsBadRequest => Type == "BadRequest";

    /// <summary>
    /// Returns the value as a <see cref="Peal.InvalidTimeRangeEncoded"/> if <see cref="Type"/> is 'InvalidTimeRange', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'InvalidTimeRange'.</exception>
    public Peal.InvalidTimeRangeEncoded AsInvalidTimeRange() =>
        IsInvalidTimeRange
            ? (Peal.InvalidTimeRangeEncoded)Value!
            : throw new global::System.Exception(
                "BadRequestErrorBody.Type is not 'InvalidTimeRange'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.EffectHttpApiErrorBadRequestEncoded"/> if <see cref="Type"/> is 'BadRequest', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'BadRequest'.</exception>
    public Peal.EffectHttpApiErrorBadRequestEncoded AsBadRequest() =>
        IsBadRequest
            ? (Peal.EffectHttpApiErrorBadRequestEncoded)Value!
            : throw new global::System.Exception("BadRequestErrorBody.Type is not 'BadRequest'");

    public T Match<T>(
        Func<Peal.InvalidTimeRangeEncoded, T> onInvalidTimeRange,
        Func<Peal.EffectHttpApiErrorBadRequestEncoded, T> onBadRequest,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "InvalidTimeRange" => onInvalidTimeRange(AsInvalidTimeRange()),
            "BadRequest" => onBadRequest(AsBadRequest()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.InvalidTimeRangeEncoded> onInvalidTimeRange,
        Action<Peal.EffectHttpApiErrorBadRequestEncoded> onBadRequest,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "InvalidTimeRange":
                onInvalidTimeRange(AsInvalidTimeRange());
                break;
            case "BadRequest":
                onBadRequest(AsBadRequest());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.InvalidTimeRangeEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsInvalidTimeRange(out Peal.InvalidTimeRangeEncoded? value)
    {
        if (Type == "InvalidTimeRange")
        {
            value = (Peal.InvalidTimeRangeEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.EffectHttpApiErrorBadRequestEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsBadRequest(out Peal.EffectHttpApiErrorBadRequestEncoded? value)
    {
        if (Type == "BadRequest")
        {
            value = (Peal.EffectHttpApiErrorBadRequestEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator BadRequestErrorBody(
        BadRequestErrorBody.InvalidTimeRange value
    ) => new(value);

    public static implicit operator BadRequestErrorBody(BadRequestErrorBody.BadRequest value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<BadRequestErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(BadRequestErrorBody).IsAssignableFrom(typeToConvert);

        public override BadRequestErrorBody Read(
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
                "InvalidTimeRange" => json.Deserialize<Peal.InvalidTimeRangeEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.InvalidTimeRangeEncoded"
                    ),
                "BadRequest" => json.Deserialize<Peal.EffectHttpApiErrorBadRequestEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.EffectHttpApiErrorBadRequestEncoded"
                    ),
                _ => json.Deserialize<object?>(options),
            };
            return new BadRequestErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BadRequestErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "InvalidTimeRange" => JsonSerializer.SerializeToNode(value.Value, options),
                    "BadRequest" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override BadRequestErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new BadRequestErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BadRequestErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for InvalidTimeRange
    /// </summary>
    [Serializable]
    public struct InvalidTimeRange
    {
        public InvalidTimeRange(Peal.InvalidTimeRangeEncoded value)
        {
            Value = value;
        }

        internal Peal.InvalidTimeRangeEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator BadRequestErrorBody.InvalidTimeRange(
            Peal.InvalidTimeRangeEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for BadRequest
    /// </summary>
    [Serializable]
    public struct BadRequest
    {
        public BadRequest(Peal.EffectHttpApiErrorBadRequestEncoded value)
        {
            Value = value;
        }

        internal Peal.EffectHttpApiErrorBadRequestEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator BadRequestErrorBody.BadRequest(
            Peal.EffectHttpApiErrorBadRequestEncoded value
        ) => new(value);
    }
}
