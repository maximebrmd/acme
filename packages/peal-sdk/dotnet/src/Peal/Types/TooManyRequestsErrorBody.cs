// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TooManyRequestsErrorBody.JsonConverter))]
[Serializable]
public record TooManyRequestsErrorBody
{
    internal TooManyRequestsErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of TooManyRequestsErrorBody with <see cref="TooManyRequestsErrorBody.TooManyConnectLinks"/>.
    /// </summary>
    public TooManyRequestsErrorBody(TooManyRequestsErrorBody.TooManyConnectLinks value)
    {
        Type = "TooManyConnectLinks";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TooManyRequestsErrorBody with <see cref="TooManyRequestsErrorBody.TooManyRequests"/>.
    /// </summary>
    public TooManyRequestsErrorBody(TooManyRequestsErrorBody.TooManyRequests value)
    {
        Type = "TooManyRequests";
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
    /// Returns true if <see cref="Type"/> is "TooManyConnectLinks"
    /// </summary>
    public bool IsTooManyConnectLinks => Type == "TooManyConnectLinks";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyRequests"
    /// </summary>
    public bool IsTooManyRequests => Type == "TooManyRequests";

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyConnectLinksEncoded"/> if <see cref="Type"/> is 'TooManyConnectLinks', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyConnectLinks'.</exception>
    public Peal.TooManyConnectLinksEncoded AsTooManyConnectLinks() =>
        IsTooManyConnectLinks
            ? (Peal.TooManyConnectLinksEncoded)Value!
            : throw new global::System.Exception(
                "TooManyRequestsErrorBody.Type is not 'TooManyConnectLinks'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyRequestsEncoded"/> if <see cref="Type"/> is 'TooManyRequests', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyRequests'.</exception>
    public Peal.TooManyRequestsEncoded AsTooManyRequests() =>
        IsTooManyRequests
            ? (Peal.TooManyRequestsEncoded)Value!
            : throw new global::System.Exception(
                "TooManyRequestsErrorBody.Type is not 'TooManyRequests'"
            );

    public T Match<T>(
        Func<Peal.TooManyConnectLinksEncoded, T> onTooManyConnectLinks,
        Func<Peal.TooManyRequestsEncoded, T> onTooManyRequests,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "TooManyConnectLinks" => onTooManyConnectLinks(AsTooManyConnectLinks()),
            "TooManyRequests" => onTooManyRequests(AsTooManyRequests()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.TooManyConnectLinksEncoded> onTooManyConnectLinks,
        Action<Peal.TooManyRequestsEncoded> onTooManyRequests,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "TooManyConnectLinks":
                onTooManyConnectLinks(AsTooManyConnectLinks());
                break;
            case "TooManyRequests":
                onTooManyRequests(AsTooManyRequests());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyConnectLinksEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyConnectLinks(out Peal.TooManyConnectLinksEncoded? value)
    {
        if (Type == "TooManyConnectLinks")
        {
            value = (Peal.TooManyConnectLinksEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyRequestsEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyRequests(out Peal.TooManyRequestsEncoded? value)
    {
        if (Type == "TooManyRequests")
        {
            value = (Peal.TooManyRequestsEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator TooManyRequestsErrorBody(
        TooManyRequestsErrorBody.TooManyConnectLinks value
    ) => new(value);

    public static implicit operator TooManyRequestsErrorBody(
        TooManyRequestsErrorBody.TooManyRequests value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<TooManyRequestsErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(TooManyRequestsErrorBody).IsAssignableFrom(typeToConvert);

        public override TooManyRequestsErrorBody Read(
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
                "TooManyConnectLinks" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TooManyConnectLinksEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TooManyConnectLinksEncoded"
                        ),
                "TooManyRequests" => json.Deserialize<Peal.TooManyRequestsEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.TooManyRequestsEncoded"),
                _ => json.Deserialize<object?>(options),
            };
            return new TooManyRequestsErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TooManyRequestsErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "TooManyConnectLinks" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyRequests" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override TooManyRequestsErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new TooManyRequestsErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TooManyRequestsErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for TooManyConnectLinks
    /// </summary>
    [Serializable]
    public struct TooManyConnectLinks
    {
        public TooManyConnectLinks(Peal.TooManyConnectLinksEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyConnectLinksEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TooManyRequestsErrorBody.TooManyConnectLinks(
            Peal.TooManyConnectLinksEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyRequests
    /// </summary>
    [Serializable]
    public struct TooManyRequests
    {
        public TooManyRequests(Peal.TooManyRequestsEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyRequestsEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TooManyRequestsErrorBody.TooManyRequests(
            Peal.TooManyRequestsEncoded value
        ) => new(value);
    }
}
