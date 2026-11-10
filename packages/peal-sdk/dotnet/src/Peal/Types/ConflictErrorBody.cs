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
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.ChannelSetNameTaken"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.ChannelSetNameTaken value)
    {
        Type = "ChannelSetNameTaken";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.TooManyChannelSets"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.TooManyChannelSets value)
    {
        Type = "TooManyChannelSets";
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
    /// Returns true if <see cref="Type"/> is "ChannelSetNameTaken"
    /// </summary>
    public bool IsChannelSetNameTaken => Type == "ChannelSetNameTaken";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyChannelSets"
    /// </summary>
    public bool IsTooManyChannelSets => Type == "TooManyChannelSets";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ChannelSetNameTakenEncoded"/> if <see cref="Type"/> is 'ChannelSetNameTaken', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelSetNameTaken'.</exception>
    public Peal.ChannelSetNameTakenEncoded AsChannelSetNameTaken() =>
        IsChannelSetNameTaken
            ? (Peal.ChannelSetNameTakenEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'ChannelSetNameTaken'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyChannelSetsEncoded"/> if <see cref="Type"/> is 'TooManyChannelSets', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyChannelSets'.</exception>
    public Peal.TooManyChannelSetsEncoded AsTooManyChannelSets() =>
        IsTooManyChannelSets
            ? (Peal.TooManyChannelSetsEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'TooManyChannelSets'"
            );

    public T Match<T>(
        Func<Peal.ChannelSetNameTakenEncoded, T> onChannelSetNameTaken,
        Func<Peal.TooManyChannelSetsEncoded, T> onTooManyChannelSets,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "ChannelSetNameTaken" => onChannelSetNameTaken(AsChannelSetNameTaken()),
            "TooManyChannelSets" => onTooManyChannelSets(AsTooManyChannelSets()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ChannelSetNameTakenEncoded> onChannelSetNameTaken,
        Action<Peal.TooManyChannelSetsEncoded> onTooManyChannelSets,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "ChannelSetNameTaken":
                onChannelSetNameTaken(AsChannelSetNameTaken());
                break;
            case "TooManyChannelSets":
                onTooManyChannelSets(AsTooManyChannelSets());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ChannelSetNameTakenEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelSetNameTaken(out Peal.ChannelSetNameTakenEncoded? value)
    {
        if (Type == "ChannelSetNameTaken")
        {
            value = (Peal.ChannelSetNameTakenEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyChannelSetsEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyChannelSets(out Peal.TooManyChannelSetsEncoded? value)
    {
        if (Type == "TooManyChannelSets")
        {
            value = (Peal.TooManyChannelSetsEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(
        ConflictErrorBody.ChannelSetNameTaken value
    ) => new(value);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.TooManyChannelSets value) =>
        new(value);

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

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("_tag");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "ChannelSetNameTaken" => json.Deserialize<Peal.ChannelSetNameTakenEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.ChannelSetNameTakenEncoded"
                    ),
                "TooManyChannelSets" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TooManyChannelSetsEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TooManyChannelSetsEncoded"
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
                    "ChannelSetNameTaken" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyChannelSets" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for ChannelSetNameTaken
    /// </summary>
    [Serializable]
    public struct ChannelSetNameTaken
    {
        public ChannelSetNameTaken(Peal.ChannelSetNameTakenEncoded value)
        {
            Value = value;
        }

        internal Peal.ChannelSetNameTakenEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.ChannelSetNameTaken(
            Peal.ChannelSetNameTakenEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyChannelSets
    /// </summary>
    [Serializable]
    public struct TooManyChannelSets
    {
        public TooManyChannelSets(Peal.TooManyChannelSetsEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyChannelSetsEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.TooManyChannelSets(
            Peal.TooManyChannelSetsEncoded value
        ) => new(value);
    }
}
