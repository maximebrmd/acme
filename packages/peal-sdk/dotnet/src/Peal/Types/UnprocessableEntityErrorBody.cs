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
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.RecyclingEndsTooSoon"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.RecyclingEndsTooSoon value)
    {
        Type = "RecyclingEndsTooSoon";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.RecyclingVariantsInvalid"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.RecyclingVariantsInvalid value)
    {
        Type = "RecyclingVariantsInvalid";
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
    /// Returns true if <see cref="Type"/> is "RecyclingEndsTooSoon"
    /// </summary>
    public bool IsRecyclingEndsTooSoon => Type == "RecyclingEndsTooSoon";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "RecyclingVariantsInvalid"
    /// </summary>
    public bool IsRecyclingVariantsInvalid => Type == "RecyclingVariantsInvalid";

    /// <summary>
    /// Returns the value as a <see cref="Peal.RecyclingEndsTooSoonEncoded"/> if <see cref="Type"/> is 'RecyclingEndsTooSoon', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'RecyclingEndsTooSoon'.</exception>
    public Peal.RecyclingEndsTooSoonEncoded AsRecyclingEndsTooSoon() =>
        IsRecyclingEndsTooSoon
            ? (Peal.RecyclingEndsTooSoonEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'RecyclingEndsTooSoon'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.RecyclingVariantsInvalidEncoded"/> if <see cref="Type"/> is 'RecyclingVariantsInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'RecyclingVariantsInvalid'.</exception>
    public Peal.RecyclingVariantsInvalidEncoded AsRecyclingVariantsInvalid() =>
        IsRecyclingVariantsInvalid
            ? (Peal.RecyclingVariantsInvalidEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'RecyclingVariantsInvalid'"
            );

    public T Match<T>(
        Func<Peal.RecyclingEndsTooSoonEncoded, T> onRecyclingEndsTooSoon,
        Func<Peal.RecyclingVariantsInvalidEncoded, T> onRecyclingVariantsInvalid,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "RecyclingEndsTooSoon" => onRecyclingEndsTooSoon(AsRecyclingEndsTooSoon()),
            "RecyclingVariantsInvalid" => onRecyclingVariantsInvalid(AsRecyclingVariantsInvalid()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.RecyclingEndsTooSoonEncoded> onRecyclingEndsTooSoon,
        Action<Peal.RecyclingVariantsInvalidEncoded> onRecyclingVariantsInvalid,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "RecyclingEndsTooSoon":
                onRecyclingEndsTooSoon(AsRecyclingEndsTooSoon());
                break;
            case "RecyclingVariantsInvalid":
                onRecyclingVariantsInvalid(AsRecyclingVariantsInvalid());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.RecyclingEndsTooSoonEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsRecyclingEndsTooSoon(out Peal.RecyclingEndsTooSoonEncoded? value)
    {
        if (Type == "RecyclingEndsTooSoon")
        {
            value = (Peal.RecyclingEndsTooSoonEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.RecyclingVariantsInvalidEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsRecyclingVariantsInvalid(out Peal.RecyclingVariantsInvalidEncoded? value)
    {
        if (Type == "RecyclingVariantsInvalid")
        {
            value = (Peal.RecyclingVariantsInvalidEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.RecyclingEndsTooSoon value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.RecyclingVariantsInvalid value
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
                "RecyclingEndsTooSoon" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.RecyclingEndsTooSoonEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.RecyclingEndsTooSoonEncoded"
                        ),
                "RecyclingVariantsInvalid" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.RecyclingVariantsInvalidEncoded?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.RecyclingVariantsInvalidEncoded"
                        ),
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
                    "RecyclingEndsTooSoon" => JsonSerializer.SerializeToNode(value.Value, options),
                    "RecyclingVariantsInvalid" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
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
    /// Discriminated union type for RecyclingEndsTooSoon
    /// </summary>
    [Serializable]
    public struct RecyclingEndsTooSoon
    {
        public RecyclingEndsTooSoon(Peal.RecyclingEndsTooSoonEncoded value)
        {
            Value = value;
        }

        internal Peal.RecyclingEndsTooSoonEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.RecyclingEndsTooSoon(
            Peal.RecyclingEndsTooSoonEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for RecyclingVariantsInvalid
    /// </summary>
    [Serializable]
    public struct RecyclingVariantsInvalid
    {
        public RecyclingVariantsInvalid(Peal.RecyclingVariantsInvalidEncoded value)
        {
            Value = value;
        }

        internal Peal.RecyclingVariantsInvalidEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.RecyclingVariantsInvalid(
            Peal.RecyclingVariantsInvalidEncoded value
        ) => new(value);
    }
}
