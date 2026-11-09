// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TargetConfirmation.JsonConverter))]
[Serializable]
public record TargetConfirmation
{
    internal TargetConfirmation(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of TargetConfirmation with <see cref="TargetConfirmation.Published"/>.
    /// </summary>
    public TargetConfirmation(TargetConfirmation.Published value)
    {
        Type = "published";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TargetConfirmation with <see cref="TargetConfirmation.NotPublished"/>.
    /// </summary>
    public TargetConfirmation(TargetConfirmation.NotPublished value)
    {
        Type = "notPublished";
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
    /// Returns true if <see cref="Type"/> is "published"
    /// </summary>
    public bool IsPublished => Type == "published";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "notPublished"
    /// </summary>
    public bool IsNotPublished => Type == "notPublished";

    /// <summary>
    /// Returns the value as a <see cref="Peal.TargetConfirmationPublished"/> if <see cref="Type"/> is 'published', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'published'.</exception>
    public Peal.TargetConfirmationPublished AsPublished() =>
        IsPublished
            ? (Peal.TargetConfirmationPublished)Value!
            : throw new global::System.Exception("TargetConfirmation.Type is not 'published'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.TargetConfirmationNotPublished"/> if <see cref="Type"/> is 'notPublished', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'notPublished'.</exception>
    public Peal.TargetConfirmationNotPublished AsNotPublished() =>
        IsNotPublished
            ? (Peal.TargetConfirmationNotPublished)Value!
            : throw new global::System.Exception("TargetConfirmation.Type is not 'notPublished'");

    public T Match<T>(
        Func<Peal.TargetConfirmationPublished, T> onPublished,
        Func<Peal.TargetConfirmationNotPublished, T> onNotPublished,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "published" => onPublished(AsPublished()),
            "notPublished" => onNotPublished(AsNotPublished()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.TargetConfirmationPublished> onPublished,
        Action<Peal.TargetConfirmationNotPublished> onNotPublished,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "published":
                onPublished(AsPublished());
                break;
            case "notPublished":
                onNotPublished(AsNotPublished());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TargetConfirmationPublished"/> and returns true if successful.
    /// </summary>
    public bool TryAsPublished(out Peal.TargetConfirmationPublished? value)
    {
        if (Type == "published")
        {
            value = (Peal.TargetConfirmationPublished)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TargetConfirmationNotPublished"/> and returns true if successful.
    /// </summary>
    public bool TryAsNotPublished(out Peal.TargetConfirmationNotPublished? value)
    {
        if (Type == "notPublished")
        {
            value = (Peal.TargetConfirmationNotPublished)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator TargetConfirmation(TargetConfirmation.Published value) =>
        new(value);

    public static implicit operator TargetConfirmation(TargetConfirmation.NotPublished value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<TargetConfirmation>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(TargetConfirmation).IsAssignableFrom(typeToConvert);

        public override TargetConfirmation Read(
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
                "published" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TargetConfirmationPublished?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TargetConfirmationPublished"
                        ),
                "notPublished" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TargetConfirmationNotPublished?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TargetConfirmationNotPublished"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new TargetConfirmation(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TargetConfirmation value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "published" => JsonSerializer.SerializeToNode(value.Value, options),
                    "notPublished" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override TargetConfirmation ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new TargetConfirmation(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TargetConfirmation value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for published
    /// </summary>
    [Serializable]
    public struct Published
    {
        public Published(Peal.TargetConfirmationPublished value)
        {
            Value = value;
        }

        internal Peal.TargetConfirmationPublished Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetConfirmation.Published(
            Peal.TargetConfirmationPublished value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for notPublished
    /// </summary>
    [Serializable]
    public struct NotPublished
    {
        public NotPublished(Peal.TargetConfirmationNotPublished value)
        {
            Value = value;
        }

        internal Peal.TargetConfirmationNotPublished Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TargetConfirmation.NotPublished(
            Peal.TargetConfirmationNotPublished value
        ) => new(value);
    }
}
