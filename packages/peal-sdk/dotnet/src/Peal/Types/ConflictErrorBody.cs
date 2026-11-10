// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConflictErrorBody.JsonConverter))]
[Serializable]
public record ConflictErrorBody
{
    internal ConflictErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.ExternalIdTaken"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.ExternalIdTaken value)
    {
        Type = "ExternalIdTaken";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.IdempotencyKeyReused"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.IdempotencyKeyReused value)
    {
        Type = "IdempotencyKeyReused";
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
    /// Returns true if <see cref="Type"/> is "ExternalIdTaken"
    /// </summary>
    public bool IsExternalIdTaken => Type == "ExternalIdTaken";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "IdempotencyKeyReused"
    /// </summary>
    public bool IsIdempotencyKeyReused => Type == "IdempotencyKeyReused";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ExternalIdTakenEncoded"/> if <see cref="Type"/> is 'ExternalIdTaken', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ExternalIdTaken'.</exception>
    public Peal.ExternalIdTakenEncoded AsExternalIdTaken() =>
        IsExternalIdTaken
            ? (Peal.ExternalIdTakenEncoded)Value!
            : throw new global::System.Exception("ConflictErrorBody.Type is not 'ExternalIdTaken'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.IdempotencyKeyReusedEncoded"/> if <see cref="Type"/> is 'IdempotencyKeyReused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'IdempotencyKeyReused'.</exception>
    public Peal.IdempotencyKeyReusedEncoded AsIdempotencyKeyReused() =>
        IsIdempotencyKeyReused
            ? (Peal.IdempotencyKeyReusedEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'IdempotencyKeyReused'"
            );

    public T Match<T>(
        Func<Peal.ExternalIdTakenEncoded, T> onExternalIdTaken,
        Func<Peal.IdempotencyKeyReusedEncoded, T> onIdempotencyKeyReused,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "ExternalIdTaken" => onExternalIdTaken(AsExternalIdTaken()),
            "IdempotencyKeyReused" => onIdempotencyKeyReused(AsIdempotencyKeyReused()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ExternalIdTakenEncoded> onExternalIdTaken,
        Action<Peal.IdempotencyKeyReusedEncoded> onIdempotencyKeyReused,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "ExternalIdTaken":
                onExternalIdTaken(AsExternalIdTaken());
                break;
            case "IdempotencyKeyReused":
                onIdempotencyKeyReused(AsIdempotencyKeyReused());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ExternalIdTakenEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsExternalIdTaken(out Peal.ExternalIdTakenEncoded? value)
    {
        if (Type == "ExternalIdTaken")
        {
            value = (Peal.ExternalIdTakenEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.IdempotencyKeyReusedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsIdempotencyKeyReused(out Peal.IdempotencyKeyReusedEncoded? value)
    {
        if (Type == "IdempotencyKeyReused")
        {
            value = (Peal.IdempotencyKeyReusedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.ExternalIdTaken value) =>
        new(value);

    public static implicit operator ConflictErrorBody(
        ConflictErrorBody.IdempotencyKeyReused value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ConflictErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ConflictErrorBody).IsAssignableFrom(typeToConvert);

        public override ConflictErrorBody Read(
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
                "ExternalIdTaken" => json.Deserialize<Peal.ExternalIdTakenEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ExternalIdTakenEncoded"),
                "IdempotencyKeyReused" => json.Deserialize<Peal.IdempotencyKeyReusedEncoded?>(
                    options
                )
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.IdempotencyKeyReusedEncoded"
                    ),
                _ => json.Deserialize<object?>(options),
            };
            return new ConflictErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConflictErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "ExternalIdTaken" => JsonSerializer.SerializeToNode(value.Value, options),
                    "IdempotencyKeyReused" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ConflictErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ConflictErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConflictErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for ExternalIdTaken
    /// </summary>
    [Serializable]
    public struct ExternalIdTaken
    {
        public ExternalIdTaken(Peal.ExternalIdTakenEncoded value)
        {
            Value = value;
        }

        internal Peal.ExternalIdTakenEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.ExternalIdTaken(
            Peal.ExternalIdTakenEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for IdempotencyKeyReused
    /// </summary>
    [Serializable]
    public struct IdempotencyKeyReused
    {
        public IdempotencyKeyReused(Peal.IdempotencyKeyReusedEncoded value)
        {
            Value = value;
        }

        internal Peal.IdempotencyKeyReusedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.IdempotencyKeyReused(
            Peal.IdempotencyKeyReusedEncoded value
        ) => new(value);
    }
}
