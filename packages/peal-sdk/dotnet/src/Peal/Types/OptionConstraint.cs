// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(OptionConstraint.JsonConverter))]
[Serializable]
public record OptionConstraint
{
    internal OptionConstraint(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of OptionConstraint with <see cref="OptionConstraint.NeedsOneOf"/>.
    /// </summary>
    public OptionConstraint(OptionConstraint.NeedsOneOf value)
    {
        Type = "needsOneOf";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of OptionConstraint with <see cref="OptionConstraint.NotWith"/>.
    /// </summary>
    public OptionConstraint(OptionConstraint.NotWith value)
    {
        Type = "notWith";
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
    /// Returns true if <see cref="Type"/> is "needsOneOf"
    /// </summary>
    public bool IsNeedsOneOf => Type == "needsOneOf";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "notWith"
    /// </summary>
    public bool IsNotWith => Type == "notWith";

    /// <summary>
    /// Returns the value as a <see cref="Peal.OptionConstraintNeedsOneOf"/> if <see cref="Type"/> is 'needsOneOf', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'needsOneOf'.</exception>
    public Peal.OptionConstraintNeedsOneOf AsNeedsOneOf() =>
        IsNeedsOneOf
            ? (Peal.OptionConstraintNeedsOneOf)Value!
            : throw new global::System.Exception("OptionConstraint.Type is not 'needsOneOf'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.OptionConstraintNotWith"/> if <see cref="Type"/> is 'notWith', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'notWith'.</exception>
    public Peal.OptionConstraintNotWith AsNotWith() =>
        IsNotWith
            ? (Peal.OptionConstraintNotWith)Value!
            : throw new global::System.Exception("OptionConstraint.Type is not 'notWith'");

    public T Match<T>(
        Func<Peal.OptionConstraintNeedsOneOf, T> onNeedsOneOf,
        Func<Peal.OptionConstraintNotWith, T> onNotWith,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "needsOneOf" => onNeedsOneOf(AsNeedsOneOf()),
            "notWith" => onNotWith(AsNotWith()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.OptionConstraintNeedsOneOf> onNeedsOneOf,
        Action<Peal.OptionConstraintNotWith> onNotWith,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "needsOneOf":
                onNeedsOneOf(AsNeedsOneOf());
                break;
            case "notWith":
                onNotWith(AsNotWith());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.OptionConstraintNeedsOneOf"/> and returns true if successful.
    /// </summary>
    public bool TryAsNeedsOneOf(out Peal.OptionConstraintNeedsOneOf? value)
    {
        if (Type == "needsOneOf")
        {
            value = (Peal.OptionConstraintNeedsOneOf)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.OptionConstraintNotWith"/> and returns true if successful.
    /// </summary>
    public bool TryAsNotWith(out Peal.OptionConstraintNotWith? value)
    {
        if (Type == "notWith")
        {
            value = (Peal.OptionConstraintNotWith)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator OptionConstraint(OptionConstraint.NeedsOneOf value) =>
        new(value);

    public static implicit operator OptionConstraint(OptionConstraint.NotWith value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<OptionConstraint>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(OptionConstraint).IsAssignableFrom(typeToConvert);

        public override OptionConstraint Read(
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
                "needsOneOf" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.OptionConstraintNeedsOneOf?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.OptionConstraintNeedsOneOf"
                        ),
                "notWith" => jsonWithoutDiscriminator.Deserialize<Peal.OptionConstraintNotWith?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.OptionConstraintNotWith"),
                _ => json.Deserialize<object?>(options),
            };
            return new OptionConstraint(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            OptionConstraint value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "needsOneOf" => JsonSerializer.SerializeToNode(value.Value, options),
                    "notWith" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override OptionConstraint ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new OptionConstraint(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            OptionConstraint value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for needsOneOf
    /// </summary>
    [Serializable]
    public struct NeedsOneOf
    {
        public NeedsOneOf(Peal.OptionConstraintNeedsOneOf value)
        {
            Value = value;
        }

        internal Peal.OptionConstraintNeedsOneOf Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator OptionConstraint.NeedsOneOf(
            Peal.OptionConstraintNeedsOneOf value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for notWith
    /// </summary>
    [Serializable]
    public struct NotWith
    {
        public NotWith(Peal.OptionConstraintNotWith value)
        {
            Value = value;
        }

        internal Peal.OptionConstraintNotWith Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator OptionConstraint.NotWith(
            Peal.OptionConstraintNotWith value
        ) => new(value);
    }
}
