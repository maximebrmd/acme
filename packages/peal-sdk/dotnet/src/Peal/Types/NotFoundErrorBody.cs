// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NotFoundErrorBody.JsonConverter))]
[Serializable]
public record NotFoundErrorBody
{
    internal NotFoundErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of NotFoundErrorBody with <see cref="NotFoundErrorBody.ChannelNotFound"/>.
    /// </summary>
    public NotFoundErrorBody(NotFoundErrorBody.ChannelNotFound value)
    {
        Type = "ChannelNotFound";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NotFoundErrorBody with <see cref="NotFoundErrorBody.WorkspaceNotFound"/>.
    /// </summary>
    public NotFoundErrorBody(NotFoundErrorBody.WorkspaceNotFound value)
    {
        Type = "WorkspaceNotFound";
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
    /// Returns true if <see cref="Type"/> is "ChannelNotFound"
    /// </summary>
    public bool IsChannelNotFound => Type == "ChannelNotFound";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "WorkspaceNotFound"
    /// </summary>
    public bool IsWorkspaceNotFound => Type == "WorkspaceNotFound";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ChannelNotFoundEncoded"/> if <see cref="Type"/> is 'ChannelNotFound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelNotFound'.</exception>
    public Peal.ChannelNotFoundEncoded AsChannelNotFound() =>
        IsChannelNotFound
            ? (Peal.ChannelNotFoundEncoded)Value!
            : throw new global::System.Exception("NotFoundErrorBody.Type is not 'ChannelNotFound'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.WorkspaceNotFoundEncoded"/> if <see cref="Type"/> is 'WorkspaceNotFound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'WorkspaceNotFound'.</exception>
    public Peal.WorkspaceNotFoundEncoded AsWorkspaceNotFound() =>
        IsWorkspaceNotFound
            ? (Peal.WorkspaceNotFoundEncoded)Value!
            : throw new global::System.Exception(
                "NotFoundErrorBody.Type is not 'WorkspaceNotFound'"
            );

    public T Match<T>(
        Func<Peal.ChannelNotFoundEncoded, T> onChannelNotFound,
        Func<Peal.WorkspaceNotFoundEncoded, T> onWorkspaceNotFound,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "ChannelNotFound" => onChannelNotFound(AsChannelNotFound()),
            "WorkspaceNotFound" => onWorkspaceNotFound(AsWorkspaceNotFound()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ChannelNotFoundEncoded> onChannelNotFound,
        Action<Peal.WorkspaceNotFoundEncoded> onWorkspaceNotFound,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "ChannelNotFound":
                onChannelNotFound(AsChannelNotFound());
                break;
            case "WorkspaceNotFound":
                onWorkspaceNotFound(AsWorkspaceNotFound());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ChannelNotFoundEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelNotFound(out Peal.ChannelNotFoundEncoded? value)
    {
        if (Type == "ChannelNotFound")
        {
            value = (Peal.ChannelNotFoundEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.WorkspaceNotFoundEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsWorkspaceNotFound(out Peal.WorkspaceNotFoundEncoded? value)
    {
        if (Type == "WorkspaceNotFound")
        {
            value = (Peal.WorkspaceNotFoundEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator NotFoundErrorBody(NotFoundErrorBody.ChannelNotFound value) =>
        new(value);

    public static implicit operator NotFoundErrorBody(NotFoundErrorBody.WorkspaceNotFound value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<NotFoundErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(NotFoundErrorBody).IsAssignableFrom(typeToConvert);

        public override NotFoundErrorBody Read(
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
                "ChannelNotFound" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ChannelNotFoundEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ChannelNotFoundEncoded"
                        ),
                "WorkspaceNotFound" => json.Deserialize<Peal.WorkspaceNotFoundEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.WorkspaceNotFoundEncoded"
                    ),
                _ => json.Deserialize<object?>(options),
            };
            return new NotFoundErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NotFoundErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "ChannelNotFound" => JsonSerializer.SerializeToNode(value.Value, options),
                    "WorkspaceNotFound" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override NotFoundErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new NotFoundErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NotFoundErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for ChannelNotFound
    /// </summary>
    [Serializable]
    public struct ChannelNotFound
    {
        public ChannelNotFound(Peal.ChannelNotFoundEncoded value)
        {
            Value = value;
        }

        internal Peal.ChannelNotFoundEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NotFoundErrorBody.ChannelNotFound(
            Peal.ChannelNotFoundEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for WorkspaceNotFound
    /// </summary>
    [Serializable]
    public struct WorkspaceNotFound
    {
        public WorkspaceNotFound(Peal.WorkspaceNotFoundEncoded value)
        {
            Value = value;
        }

        internal Peal.WorkspaceNotFoundEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NotFoundErrorBody.WorkspaceNotFound(
            Peal.WorkspaceNotFoundEncoded value
        ) => new(value);
    }
}
