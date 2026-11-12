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
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.FeedAddressRefused"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.FeedAddressRefused value)
    {
        Type = "FeedAddressRefused";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.FeedTemplateInvalid"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.FeedTemplateInvalid value)
    {
        Type = "FeedTemplateInvalid";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UnprocessableEntityErrorBody with <see cref="UnprocessableEntityErrorBody.FeedUnreadable"/>.
    /// </summary>
    public UnprocessableEntityErrorBody(UnprocessableEntityErrorBody.FeedUnreadable value)
    {
        Type = "FeedUnreadable";
        Value = value.Value;
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
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("_tag")]
    public string Type { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Type"/> is "FeedAddressRefused"
    /// </summary>
    public bool IsFeedAddressRefused => Type == "FeedAddressRefused";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "FeedTemplateInvalid"
    /// </summary>
    public bool IsFeedTemplateInvalid => Type == "FeedTemplateInvalid";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "FeedUnreadable"
    /// </summary>
    public bool IsFeedUnreadable => Type == "FeedUnreadable";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "UnknownChannels"
    /// </summary>
    public bool IsUnknownChannels => Type == "UnknownChannels";

    /// <summary>
    /// Returns the value as a <see cref="Peal.FeedAddressRefusedEncoded"/> if <see cref="Type"/> is 'FeedAddressRefused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'FeedAddressRefused'.</exception>
    public Peal.FeedAddressRefusedEncoded AsFeedAddressRefused() =>
        IsFeedAddressRefused
            ? (Peal.FeedAddressRefusedEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'FeedAddressRefused'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.FeedTemplateInvalidEncoded"/> if <see cref="Type"/> is 'FeedTemplateInvalid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'FeedTemplateInvalid'.</exception>
    public Peal.FeedTemplateInvalidEncoded AsFeedTemplateInvalid() =>
        IsFeedTemplateInvalid
            ? (Peal.FeedTemplateInvalidEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'FeedTemplateInvalid'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.FeedUnreadableEncoded"/> if <see cref="Type"/> is 'FeedUnreadable', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'FeedUnreadable'.</exception>
    public Peal.FeedUnreadableEncoded AsFeedUnreadable() =>
        IsFeedUnreadable
            ? (Peal.FeedUnreadableEncoded)Value!
            : throw new global::System.Exception(
                "UnprocessableEntityErrorBody.Type is not 'FeedUnreadable'"
            );

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

    public T Match<T>(
        Func<Peal.FeedAddressRefusedEncoded, T> onFeedAddressRefused,
        Func<Peal.FeedTemplateInvalidEncoded, T> onFeedTemplateInvalid,
        Func<Peal.FeedUnreadableEncoded, T> onFeedUnreadable,
        Func<Peal.UnknownChannelsEncoded, T> onUnknownChannels,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "FeedAddressRefused" => onFeedAddressRefused(AsFeedAddressRefused()),
            "FeedTemplateInvalid" => onFeedTemplateInvalid(AsFeedTemplateInvalid()),
            "FeedUnreadable" => onFeedUnreadable(AsFeedUnreadable()),
            "UnknownChannels" => onUnknownChannels(AsUnknownChannels()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.FeedAddressRefusedEncoded> onFeedAddressRefused,
        Action<Peal.FeedTemplateInvalidEncoded> onFeedTemplateInvalid,
        Action<Peal.FeedUnreadableEncoded> onFeedUnreadable,
        Action<Peal.UnknownChannelsEncoded> onUnknownChannels,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "FeedAddressRefused":
                onFeedAddressRefused(AsFeedAddressRefused());
                break;
            case "FeedTemplateInvalid":
                onFeedTemplateInvalid(AsFeedTemplateInvalid());
                break;
            case "FeedUnreadable":
                onFeedUnreadable(AsFeedUnreadable());
                break;
            case "UnknownChannels":
                onUnknownChannels(AsUnknownChannels());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.FeedAddressRefusedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsFeedAddressRefused(out Peal.FeedAddressRefusedEncoded? value)
    {
        if (Type == "FeedAddressRefused")
        {
            value = (Peal.FeedAddressRefusedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.FeedTemplateInvalidEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsFeedTemplateInvalid(out Peal.FeedTemplateInvalidEncoded? value)
    {
        if (Type == "FeedTemplateInvalid")
        {
            value = (Peal.FeedTemplateInvalidEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.FeedUnreadableEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsFeedUnreadable(out Peal.FeedUnreadableEncoded? value)
    {
        if (Type == "FeedUnreadable")
        {
            value = (Peal.FeedUnreadableEncoded)Value!;
            return true;
        }
        value = null;
        return false;
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

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.FeedAddressRefused value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.FeedTemplateInvalid value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.FeedUnreadable value
    ) => new(value);

    public static implicit operator UnprocessableEntityErrorBody(
        UnprocessableEntityErrorBody.UnknownChannels value
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
                "FeedAddressRefused" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.FeedAddressRefusedEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.FeedAddressRefusedEncoded"
                        ),
                "FeedTemplateInvalid" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.FeedTemplateInvalidEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.FeedTemplateInvalidEncoded"
                        ),
                "FeedUnreadable" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.FeedUnreadableEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.FeedUnreadableEncoded"
                        ),
                "UnknownChannels" => json.Deserialize<Peal.UnknownChannelsEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.UnknownChannelsEncoded"),
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
                    "FeedAddressRefused" => JsonSerializer.SerializeToNode(value.Value, options),
                    "FeedTemplateInvalid" => JsonSerializer.SerializeToNode(value.Value, options),
                    "FeedUnreadable" => JsonSerializer.SerializeToNode(value.Value, options),
                    "UnknownChannels" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for FeedAddressRefused
    /// </summary>
    [Serializable]
    public struct FeedAddressRefused
    {
        public FeedAddressRefused(Peal.FeedAddressRefusedEncoded value)
        {
            Value = value;
        }

        internal Peal.FeedAddressRefusedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.FeedAddressRefused(
            Peal.FeedAddressRefusedEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for FeedTemplateInvalid
    /// </summary>
    [Serializable]
    public struct FeedTemplateInvalid
    {
        public FeedTemplateInvalid(Peal.FeedTemplateInvalidEncoded value)
        {
            Value = value;
        }

        internal Peal.FeedTemplateInvalidEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.FeedTemplateInvalid(
            Peal.FeedTemplateInvalidEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for FeedUnreadable
    /// </summary>
    [Serializable]
    public struct FeedUnreadable
    {
        public FeedUnreadable(Peal.FeedUnreadableEncoded value)
        {
            Value = value;
        }

        internal Peal.FeedUnreadableEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UnprocessableEntityErrorBody.FeedUnreadable(
            Peal.FeedUnreadableEncoded value
        ) => new(value);
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
}
