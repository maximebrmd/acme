// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostWarning.JsonConverter))]
[Serializable]
public record PostWarning
{
    internal PostWarning(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of PostWarning with <see cref="PostWarning.ChannelsDropped"/>.
    /// </summary>
    public PostWarning(PostWarning.ChannelsDropped value)
    {
        Type = "channelsDropped";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostWarning with <see cref="PostWarning.QueueChannelsDropped"/>.
    /// </summary>
    public PostWarning(PostWarning.QueueChannelsDropped value)
    {
        Type = "queueChannelsDropped";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PostWarning with <see cref="PostWarning.XNotBilled"/>.
    /// </summary>
    public PostWarning(PostWarning.XNotBilled value)
    {
        Type = "xNotBilled";
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
    /// Returns true if <see cref="Type"/> is "channelsDropped"
    /// </summary>
    public bool IsChannelsDropped => Type == "channelsDropped";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "queueChannelsDropped"
    /// </summary>
    public bool IsQueueChannelsDropped => Type == "queueChannelsDropped";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "xNotBilled"
    /// </summary>
    public bool IsXNotBilled => Type == "xNotBilled";

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostWarningChannelsDropped"/> if <see cref="Type"/> is 'channelsDropped', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'channelsDropped'.</exception>
    public Peal.PostWarningChannelsDropped AsChannelsDropped() =>
        IsChannelsDropped
            ? (Peal.PostWarningChannelsDropped)Value!
            : throw new global::System.Exception("PostWarning.Type is not 'channelsDropped'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostWarningQueueChannelsDropped"/> if <see cref="Type"/> is 'queueChannelsDropped', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'queueChannelsDropped'.</exception>
    public Peal.PostWarningQueueChannelsDropped AsQueueChannelsDropped() =>
        IsQueueChannelsDropped
            ? (Peal.PostWarningQueueChannelsDropped)Value!
            : throw new global::System.Exception("PostWarning.Type is not 'queueChannelsDropped'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostWarningXNotBilled"/> if <see cref="Type"/> is 'xNotBilled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'xNotBilled'.</exception>
    public Peal.PostWarningXNotBilled AsXNotBilled() =>
        IsXNotBilled
            ? (Peal.PostWarningXNotBilled)Value!
            : throw new global::System.Exception("PostWarning.Type is not 'xNotBilled'");

    public T Match<T>(
        Func<Peal.PostWarningChannelsDropped, T> onChannelsDropped,
        Func<Peal.PostWarningQueueChannelsDropped, T> onQueueChannelsDropped,
        Func<Peal.PostWarningXNotBilled, T> onXNotBilled,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "channelsDropped" => onChannelsDropped(AsChannelsDropped()),
            "queueChannelsDropped" => onQueueChannelsDropped(AsQueueChannelsDropped()),
            "xNotBilled" => onXNotBilled(AsXNotBilled()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.PostWarningChannelsDropped> onChannelsDropped,
        Action<Peal.PostWarningQueueChannelsDropped> onQueueChannelsDropped,
        Action<Peal.PostWarningXNotBilled> onXNotBilled,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "channelsDropped":
                onChannelsDropped(AsChannelsDropped());
                break;
            case "queueChannelsDropped":
                onQueueChannelsDropped(AsQueueChannelsDropped());
                break;
            case "xNotBilled":
                onXNotBilled(AsXNotBilled());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostWarningChannelsDropped"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelsDropped(out Peal.PostWarningChannelsDropped? value)
    {
        if (Type == "channelsDropped")
        {
            value = (Peal.PostWarningChannelsDropped)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostWarningQueueChannelsDropped"/> and returns true if successful.
    /// </summary>
    public bool TryAsQueueChannelsDropped(out Peal.PostWarningQueueChannelsDropped? value)
    {
        if (Type == "queueChannelsDropped")
        {
            value = (Peal.PostWarningQueueChannelsDropped)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostWarningXNotBilled"/> and returns true if successful.
    /// </summary>
    public bool TryAsXNotBilled(out Peal.PostWarningXNotBilled? value)
    {
        if (Type == "xNotBilled")
        {
            value = (Peal.PostWarningXNotBilled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator PostWarning(PostWarning.ChannelsDropped value) => new(value);

    public static implicit operator PostWarning(PostWarning.QueueChannelsDropped value) =>
        new(value);

    public static implicit operator PostWarning(PostWarning.XNotBilled value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<PostWarning>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(PostWarning).IsAssignableFrom(typeToConvert);

        public override PostWarning Read(
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
                "channelsDropped" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.PostWarningChannelsDropped?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.PostWarningChannelsDropped"
                        ),
                "queueChannelsDropped" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.PostWarningQueueChannelsDropped?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.PostWarningQueueChannelsDropped"
                        ),
                "xNotBilled" => jsonWithoutDiscriminator.Deserialize<Peal.PostWarningXNotBilled?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.PostWarningXNotBilled"),
                _ => json.Deserialize<object?>(options),
            };
            return new PostWarning(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostWarning value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "channelsDropped" => JsonSerializer.SerializeToNode(value.Value, options),
                    "queueChannelsDropped" => JsonSerializer.SerializeToNode(value.Value, options),
                    "xNotBilled" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override PostWarning ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new PostWarning(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostWarning value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for channelsDropped
    /// </summary>
    [Serializable]
    public struct ChannelsDropped
    {
        public ChannelsDropped(Peal.PostWarningChannelsDropped value)
        {
            Value = value;
        }

        internal Peal.PostWarningChannelsDropped Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostWarning.ChannelsDropped(
            Peal.PostWarningChannelsDropped value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for queueChannelsDropped
    /// </summary>
    [Serializable]
    public struct QueueChannelsDropped
    {
        public QueueChannelsDropped(Peal.PostWarningQueueChannelsDropped value)
        {
            Value = value;
        }

        internal Peal.PostWarningQueueChannelsDropped Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostWarning.QueueChannelsDropped(
            Peal.PostWarningQueueChannelsDropped value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for xNotBilled
    /// </summary>
    [Serializable]
    public struct XNotBilled
    {
        public XNotBilled(Peal.PostWarningXNotBilled value)
        {
            Value = value;
        }

        internal Peal.PostWarningXNotBilled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PostWarning.XNotBilled(Peal.PostWarningXNotBilled value) =>
            new(value);
    }
}
