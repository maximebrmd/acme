// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ServiceUnavailableErrorBody.JsonConverter))]
[Serializable]
public record ServiceUnavailableErrorBody
{
    internal ServiceUnavailableErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ServiceUnavailableErrorBody with <see cref="ServiceUnavailableErrorBody.BillingUnavailable"/>.
    /// </summary>
    public ServiceUnavailableErrorBody(ServiceUnavailableErrorBody.BillingUnavailable value)
    {
        Type = "BillingUnavailable";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ServiceUnavailableErrorBody with <see cref="ServiceUnavailableErrorBody.MediaStoreUnavailable"/>.
    /// </summary>
    public ServiceUnavailableErrorBody(ServiceUnavailableErrorBody.MediaStoreUnavailable value)
    {
        Type = "MediaStoreUnavailable";
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
    /// Returns true if <see cref="Type"/> is "BillingUnavailable"
    /// </summary>
    public bool IsBillingUnavailable => Type == "BillingUnavailable";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "MediaStoreUnavailable"
    /// </summary>
    public bool IsMediaStoreUnavailable => Type == "MediaStoreUnavailable";

    /// <summary>
    /// Returns the value as a <see cref="Peal.BillingUnavailableEncoded"/> if <see cref="Type"/> is 'BillingUnavailable', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'BillingUnavailable'.</exception>
    public Peal.BillingUnavailableEncoded AsBillingUnavailable() =>
        IsBillingUnavailable
            ? (Peal.BillingUnavailableEncoded)Value!
            : throw new global::System.Exception(
                "ServiceUnavailableErrorBody.Type is not 'BillingUnavailable'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.MediaStoreUnavailableEncoded"/> if <see cref="Type"/> is 'MediaStoreUnavailable', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'MediaStoreUnavailable'.</exception>
    public Peal.MediaStoreUnavailableEncoded AsMediaStoreUnavailable() =>
        IsMediaStoreUnavailable
            ? (Peal.MediaStoreUnavailableEncoded)Value!
            : throw new global::System.Exception(
                "ServiceUnavailableErrorBody.Type is not 'MediaStoreUnavailable'"
            );

    public T Match<T>(
        Func<Peal.BillingUnavailableEncoded, T> onBillingUnavailable,
        Func<Peal.MediaStoreUnavailableEncoded, T> onMediaStoreUnavailable,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "BillingUnavailable" => onBillingUnavailable(AsBillingUnavailable()),
            "MediaStoreUnavailable" => onMediaStoreUnavailable(AsMediaStoreUnavailable()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.BillingUnavailableEncoded> onBillingUnavailable,
        Action<Peal.MediaStoreUnavailableEncoded> onMediaStoreUnavailable,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "BillingUnavailable":
                onBillingUnavailable(AsBillingUnavailable());
                break;
            case "MediaStoreUnavailable":
                onMediaStoreUnavailable(AsMediaStoreUnavailable());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.BillingUnavailableEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsBillingUnavailable(out Peal.BillingUnavailableEncoded? value)
    {
        if (Type == "BillingUnavailable")
        {
            value = (Peal.BillingUnavailableEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MediaStoreUnavailableEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaStoreUnavailable(out Peal.MediaStoreUnavailableEncoded? value)
    {
        if (Type == "MediaStoreUnavailable")
        {
            value = (Peal.MediaStoreUnavailableEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ServiceUnavailableErrorBody(
        ServiceUnavailableErrorBody.BillingUnavailable value
    ) => new(value);

    public static implicit operator ServiceUnavailableErrorBody(
        ServiceUnavailableErrorBody.MediaStoreUnavailable value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ServiceUnavailableErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ServiceUnavailableErrorBody).IsAssignableFrom(typeToConvert);

        public override ServiceUnavailableErrorBody Read(
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
                "BillingUnavailable" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.BillingUnavailableEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.BillingUnavailableEncoded"
                        ),
                "MediaStoreUnavailable" => json.Deserialize<Peal.MediaStoreUnavailableEncoded?>(
                    options
                )
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.MediaStoreUnavailableEncoded"
                    ),
                _ => json.Deserialize<object?>(options),
            };
            return new ServiceUnavailableErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ServiceUnavailableErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "BillingUnavailable" => JsonSerializer.SerializeToNode(value.Value, options),
                    "MediaStoreUnavailable" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ServiceUnavailableErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ServiceUnavailableErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ServiceUnavailableErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for BillingUnavailable
    /// </summary>
    [Serializable]
    public struct BillingUnavailable
    {
        public BillingUnavailable(Peal.BillingUnavailableEncoded value)
        {
            Value = value;
        }

        internal Peal.BillingUnavailableEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ServiceUnavailableErrorBody.BillingUnavailable(
            Peal.BillingUnavailableEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for MediaStoreUnavailable
    /// </summary>
    [Serializable]
    public struct MediaStoreUnavailable
    {
        public MediaStoreUnavailable(Peal.MediaStoreUnavailableEncoded value)
        {
            Value = value;
        }

        internal Peal.MediaStoreUnavailableEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ServiceUnavailableErrorBody.MediaStoreUnavailable(
            Peal.MediaStoreUnavailableEncoded value
        ) => new(value);
    }
}
