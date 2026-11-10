// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ForbiddenErrorBody.JsonConverter))]
[Serializable]
public record ForbiddenErrorBody
{
    internal ForbiddenErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ForbiddenErrorBody with <see cref="ForbiddenErrorBody.Forbidden"/>.
    /// </summary>
    public ForbiddenErrorBody(ForbiddenErrorBody.Forbidden value)
    {
        Type = "Forbidden";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ForbiddenErrorBody with <see cref="ForbiddenErrorBody.PartnerAccountsClosed"/>.
    /// </summary>
    public ForbiddenErrorBody(ForbiddenErrorBody.PartnerAccountsClosed value)
    {
        Type = "PartnerAccountsClosed";
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
    /// Returns true if <see cref="Type"/> is "Forbidden"
    /// </summary>
    public bool IsForbidden => Type == "Forbidden";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PartnerAccountsClosed"
    /// </summary>
    public bool IsPartnerAccountsClosed => Type == "PartnerAccountsClosed";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ForbiddenEncoded"/> if <see cref="Type"/> is 'Forbidden', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'Forbidden'.</exception>
    public Peal.ForbiddenEncoded AsForbidden() =>
        IsForbidden
            ? (Peal.ForbiddenEncoded)Value!
            : throw new global::System.Exception("ForbiddenErrorBody.Type is not 'Forbidden'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PartnerAccountsClosedEncoded"/> if <see cref="Type"/> is 'PartnerAccountsClosed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PartnerAccountsClosed'.</exception>
    public Peal.PartnerAccountsClosedEncoded AsPartnerAccountsClosed() =>
        IsPartnerAccountsClosed
            ? (Peal.PartnerAccountsClosedEncoded)Value!
            : throw new global::System.Exception(
                "ForbiddenErrorBody.Type is not 'PartnerAccountsClosed'"
            );

    public T Match<T>(
        Func<Peal.ForbiddenEncoded, T> onForbidden,
        Func<Peal.PartnerAccountsClosedEncoded, T> onPartnerAccountsClosed,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "Forbidden" => onForbidden(AsForbidden()),
            "PartnerAccountsClosed" => onPartnerAccountsClosed(AsPartnerAccountsClosed()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ForbiddenEncoded> onForbidden,
        Action<Peal.PartnerAccountsClosedEncoded> onPartnerAccountsClosed,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "Forbidden":
                onForbidden(AsForbidden());
                break;
            case "PartnerAccountsClosed":
                onPartnerAccountsClosed(AsPartnerAccountsClosed());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ForbiddenEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsForbidden(out Peal.ForbiddenEncoded? value)
    {
        if (Type == "Forbidden")
        {
            value = (Peal.ForbiddenEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PartnerAccountsClosedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPartnerAccountsClosed(out Peal.PartnerAccountsClosedEncoded? value)
    {
        if (Type == "PartnerAccountsClosed")
        {
            value = (Peal.PartnerAccountsClosedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ForbiddenErrorBody(ForbiddenErrorBody.Forbidden value) =>
        new(value);

    public static implicit operator ForbiddenErrorBody(
        ForbiddenErrorBody.PartnerAccountsClosed value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ForbiddenErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ForbiddenErrorBody).IsAssignableFrom(typeToConvert);

        public override ForbiddenErrorBody Read(
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
                "Forbidden" => json.Deserialize<Peal.ForbiddenEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ForbiddenEncoded"),
                "PartnerAccountsClosed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.PartnerAccountsClosedEncoded?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.PartnerAccountsClosedEncoded"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new ForbiddenErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ForbiddenErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "Forbidden" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PartnerAccountsClosed" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ForbiddenErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ForbiddenErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ForbiddenErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for Forbidden
    /// </summary>
    [Serializable]
    public struct Forbidden
    {
        public Forbidden(Peal.ForbiddenEncoded value)
        {
            Value = value;
        }

        internal Peal.ForbiddenEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ForbiddenErrorBody.Forbidden(Peal.ForbiddenEncoded value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for PartnerAccountsClosed
    /// </summary>
    [Serializable]
    public struct PartnerAccountsClosed
    {
        public PartnerAccountsClosed(Peal.PartnerAccountsClosedEncoded value)
        {
            Value = value;
        }

        internal Peal.PartnerAccountsClosedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ForbiddenErrorBody.PartnerAccountsClosed(
            Peal.PartnerAccountsClosedEncoded value
        ) => new(value);
    }
}
