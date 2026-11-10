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
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.UnknownChannels"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.UnknownChannels value)
    {
        Type = "UnknownChannels";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.PostContentInvalid"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.PostContentInvalid value)
    {
        Type = "PostContentInvalid";
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
    /// Returns true if <see cref="Type"/> is "UnknownChannels"
    /// </summary>
    public bool IsUnknownChannels => Type == "UnknownChannels";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostContentInvalid"
    /// </summary>
    public bool IsPostContentInvalid => Type == "PostContentInvalid";

    /// <summary>
    /// Returns the value as a <see cref="Peal.UnknownChannelsEncoded"/> if <see cref="Type"/> is 'UnknownChannels', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UnknownChannels'.</exception>
    public Peal.UnknownChannelsEncoded AsUnknownChannels() =>
        IsUnknownChannels
            ? (Peal.UnknownChannelsEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'UnknownChannels'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostContentInvalidEncoded"/> if <see cref="Type"/> is 'PostContentInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostContentInvalid'.</exception>
    public Peal.PostContentInvalidEncoded AsPostContentInvalid() =>
        IsPostContentInvalid
            ? (Peal.PostContentInvalidEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'PostContentInvalid'"
            );

    public T Match<T>(
        Func<Peal.UnknownChannelsEncoded, T> onUnknownChannels,
        Func<Peal.PostContentInvalidEncoded, T> onPostContentInvalid,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "UnknownChannels" => onUnknownChannels(AsUnknownChannels()),
            "PostContentInvalid" => onPostContentInvalid(AsPostContentInvalid()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.UnknownChannelsEncoded> onUnknownChannels,
        Action<Peal.PostContentInvalidEncoded> onPostContentInvalid,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "UnknownChannels":
                onUnknownChannels(AsUnknownChannels());
                break;
            case "PostContentInvalid":
                onPostContentInvalid(AsPostContentInvalid());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UnknownChannelsEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnknownChannels(out Peal.UnknownChannelsEncoded? value)
    {
        if (Type == "UnknownChannels")
        {
            value = (Peal.UnknownChannelsEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostContentInvalidEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostContentInvalid(out Peal.PostContentInvalidEncoded? value)
    {
        if (Type == "PostContentInvalid")
        {
            value = (Peal.PostContentInvalidEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.UnknownChannels value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.PostContentInvalid value
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

            var value = discriminator switch
            {
                "UnknownChannels" => json.Deserialize<Peal.UnknownChannelsEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.UnknownChannelsEncoded"),
                "PostContentInvalid" => json.Deserialize<Peal.PostContentInvalidEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.PostContentInvalidEncoded"
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
                    "UnknownChannels" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostContentInvalid" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for UnknownChannels
    /// </summary>
    [Serializable]
    public struct UnknownChannels
    {
        public UnknownChannels(Peal.UnknownChannelsEncoded value)
        {
            Value = value;
        }

        internal Peal.UnknownChannelsEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.UnknownChannels(
            Peal.UnknownChannelsEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostContentInvalid
    /// </summary>
    [Serializable]
    public struct PostContentInvalid
    {
        public PostContentInvalid(Peal.PostContentInvalidEncoded value)
        {
            Value = value;
        }

        internal Peal.PostContentInvalidEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.PostContentInvalid(
            Peal.PostContentInvalidEncoded value
        ) => new(value);
    }
}
