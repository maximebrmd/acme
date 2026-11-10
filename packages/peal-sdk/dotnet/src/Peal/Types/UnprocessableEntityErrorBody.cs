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
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.ConnectFailed"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.ConnectFailed value)
    {
        Type = "ConnectFailed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.ReturnUrlNotAllowed"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.ReturnUrlNotAllowed value)
    {
        Type = "ReturnUrlNotAllowed";
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
    /// Returns true if <see cref="Type"/> is "ConnectFailed"
    /// </summary>
    public bool IsConnectFailed => Type == "ConnectFailed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ReturnUrlNotAllowed"
    /// </summary>
    public bool IsReturnUrlNotAllowed => Type == "ReturnUrlNotAllowed";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ConnectFailedEncoded"/> if <see cref="Type"/> is 'ConnectFailed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ConnectFailed'.</exception>
    public Peal.ConnectFailedEncoded AsConnectFailed() =>
        IsConnectFailed
            ? (Peal.ConnectFailedEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'ConnectFailed'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ReturnUrlNotAllowedEncoded"/> if <see cref="Type"/> is 'ReturnUrlNotAllowed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ReturnUrlNotAllowed'.</exception>
    public Peal.ReturnUrlNotAllowedEncoded AsReturnUrlNotAllowed() =>
        IsReturnUrlNotAllowed
            ? (Peal.ReturnUrlNotAllowedEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'ReturnUrlNotAllowed'"
            );

    public T Match<T>(
        Func<Peal.ConnectFailedEncoded, T> onConnectFailed,
        Func<Peal.ReturnUrlNotAllowedEncoded, T> onReturnUrlNotAllowed,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "ConnectFailed" => onConnectFailed(AsConnectFailed()),
            "ReturnUrlNotAllowed" => onReturnUrlNotAllowed(AsReturnUrlNotAllowed()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ConnectFailedEncoded> onConnectFailed,
        Action<Peal.ReturnUrlNotAllowedEncoded> onReturnUrlNotAllowed,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "ConnectFailed":
                onConnectFailed(AsConnectFailed());
                break;
            case "ReturnUrlNotAllowed":
                onReturnUrlNotAllowed(AsReturnUrlNotAllowed());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ConnectFailedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsConnectFailed(out Peal.ConnectFailedEncoded? value)
    {
        if (Type == "ConnectFailed")
        {
            value = (Peal.ConnectFailedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ReturnUrlNotAllowedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsReturnUrlNotAllowed(out Peal.ReturnUrlNotAllowedEncoded? value)
    {
        if (Type == "ReturnUrlNotAllowed")
        {
            value = (Peal.ReturnUrlNotAllowedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.ConnectFailed value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.ReturnUrlNotAllowed value
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
                "ConnectFailed" => json.Deserialize<Peal.ConnectFailedEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ConnectFailedEncoded"),
                "ReturnUrlNotAllowed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ReturnUrlNotAllowedEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ReturnUrlNotAllowedEncoded"
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
                    "ConnectFailed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ReturnUrlNotAllowed" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for ConnectFailed
    /// </summary>
    [Serializable]
    public struct ConnectFailed
    {
        public ConnectFailed(Peal.ConnectFailedEncoded value)
        {
            Value = value;
        }

        internal Peal.ConnectFailedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.ConnectFailed(
            Peal.ConnectFailedEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ReturnUrlNotAllowed
    /// </summary>
    [Serializable]
    public struct ReturnUrlNotAllowed
    {
        public ReturnUrlNotAllowed(Peal.ReturnUrlNotAllowedEncoded value)
        {
            Value = value;
        }

        internal Peal.ReturnUrlNotAllowedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.ReturnUrlNotAllowed(
            Peal.ReturnUrlNotAllowedEncoded value
        ) => new(value);
    }
}
