// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BadGatewayErrorBody.JsonConverter))]
[Serializable]
public record BadGatewayErrorBody
{
    internal BadGatewayErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of BadGatewayErrorBody with <see cref="BadGatewayErrorBody.AssistantFailed"/>.
    /// </summary>
    public BadGatewayErrorBody(BadGatewayErrorBody.AssistantFailed value)
    {
        Type = "AssistantFailed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of BadGatewayErrorBody with <see cref="BadGatewayErrorBody.ImageProviderRefused"/>.
    /// </summary>
    public BadGatewayErrorBody(BadGatewayErrorBody.ImageProviderRefused value)
    {
        Type = "ImageProviderRefused";
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
    /// Returns true if <see cref="Type"/> is "AssistantFailed"
    /// </summary>
    public bool IsAssistantFailed => Type == "AssistantFailed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ImageProviderRefused"
    /// </summary>
    public bool IsImageProviderRefused => Type == "ImageProviderRefused";

    /// <summary>
    /// Returns the value as a <see cref="Peal.AssistantFailedEncoded"/> if <see cref="Type"/> is 'AssistantFailed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'AssistantFailed'.</exception>
    public Peal.AssistantFailedEncoded AsAssistantFailed() =>
        IsAssistantFailed
            ? (Peal.AssistantFailedEncoded)Value!
            : throw new global::System.Exception(
                "BadGatewayErrorBody.Type is not 'AssistantFailed'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.ImageProviderRefusedEncoded"/> if <see cref="Type"/> is 'ImageProviderRefused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ImageProviderRefused'.</exception>
    public Peal.ImageProviderRefusedEncoded AsImageProviderRefused() =>
        IsImageProviderRefused
            ? (Peal.ImageProviderRefusedEncoded)Value!
            : throw new global::System.Exception(
                "BadGatewayErrorBody.Type is not 'ImageProviderRefused'"
            );

    public T Match<T>(
        Func<Peal.AssistantFailedEncoded, T> onAssistantFailed,
        Func<Peal.ImageProviderRefusedEncoded, T> onImageProviderRefused,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "AssistantFailed" => onAssistantFailed(AsAssistantFailed()),
            "ImageProviderRefused" => onImageProviderRefused(AsImageProviderRefused()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.AssistantFailedEncoded> onAssistantFailed,
        Action<Peal.ImageProviderRefusedEncoded> onImageProviderRefused,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "AssistantFailed":
                onAssistantFailed(AsAssistantFailed());
                break;
            case "ImageProviderRefused":
                onImageProviderRefused(AsImageProviderRefused());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AssistantFailedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsAssistantFailed(out Peal.AssistantFailedEncoded? value)
    {
        if (Type == "AssistantFailed")
        {
            value = (Peal.AssistantFailedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ImageProviderRefusedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsImageProviderRefused(out Peal.ImageProviderRefusedEncoded? value)
    {
        if (Type == "ImageProviderRefused")
        {
            value = (Peal.ImageProviderRefusedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator BadGatewayErrorBody(
        BadGatewayErrorBody.AssistantFailed value
    ) => new(value);

    public static implicit operator BadGatewayErrorBody(
        BadGatewayErrorBody.ImageProviderRefused value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<BadGatewayErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(BadGatewayErrorBody).IsAssignableFrom(typeToConvert);

        public override BadGatewayErrorBody Read(
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
                "AssistantFailed" => json.Deserialize<Peal.AssistantFailedEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.AssistantFailedEncoded"),
                "ImageProviderRefused" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ImageProviderRefusedEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ImageProviderRefusedEncoded"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new BadGatewayErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BadGatewayErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "AssistantFailed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ImageProviderRefused" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override BadGatewayErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new BadGatewayErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BadGatewayErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for AssistantFailed
    /// </summary>
    [Serializable]
    public struct AssistantFailed
    {
        public AssistantFailed(Peal.AssistantFailedEncoded value)
        {
            Value = value;
        }

        internal Peal.AssistantFailedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator BadGatewayErrorBody.AssistantFailed(
            Peal.AssistantFailedEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ImageProviderRefused
    /// </summary>
    [Serializable]
    public struct ImageProviderRefused
    {
        public ImageProviderRefused(Peal.ImageProviderRefusedEncoded value)
        {
            Value = value;
        }

        internal Peal.ImageProviderRefusedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator BadGatewayErrorBody.ImageProviderRefused(
            Peal.ImageProviderRefusedEncoded value
        ) => new(value);
    }
}
