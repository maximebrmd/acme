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
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.QueueNameTaken"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.QueueNameTaken value)
    {
        Type = "QueueNameTaken";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.TooManyQueues"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.TooManyQueues value)
    {
        Type = "TooManyQueues";
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
    /// Returns true if <see cref="Type"/> is "QueueNameTaken"
    /// </summary>
    public bool IsQueueNameTaken => Type == "QueueNameTaken";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyQueues"
    /// </summary>
    public bool IsTooManyQueues => Type == "TooManyQueues";

    /// <summary>
    /// Returns the value as a <see cref="Peal.QueueNameTakenEncoded"/> if <see cref="Type"/> is 'QueueNameTaken', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'QueueNameTaken'.</exception>
    public Peal.QueueNameTakenEncoded AsQueueNameTaken() =>
        IsQueueNameTaken
            ? (Peal.QueueNameTakenEncoded)Value!
            : throw new global::System.Exception("ConflictErrorBody.Type is not 'QueueNameTaken'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyQueuesEncoded"/> if <see cref="Type"/> is 'TooManyQueues', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyQueues'.</exception>
    public Peal.TooManyQueuesEncoded AsTooManyQueues() =>
        IsTooManyQueues
            ? (Peal.TooManyQueuesEncoded)Value!
            : throw new global::System.Exception("ConflictErrorBody.Type is not 'TooManyQueues'");

    public T Match<T>(
        Func<Peal.QueueNameTakenEncoded, T> onQueueNameTaken,
        Func<Peal.TooManyQueuesEncoded, T> onTooManyQueues,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "QueueNameTaken" => onQueueNameTaken(AsQueueNameTaken()),
            "TooManyQueues" => onTooManyQueues(AsTooManyQueues()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.QueueNameTakenEncoded> onQueueNameTaken,
        Action<Peal.TooManyQueuesEncoded> onTooManyQueues,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "QueueNameTaken":
                onQueueNameTaken(AsQueueNameTaken());
                break;
            case "TooManyQueues":
                onTooManyQueues(AsTooManyQueues());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.QueueNameTakenEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsQueueNameTaken(out Peal.QueueNameTakenEncoded? value)
    {
        if (Type == "QueueNameTaken")
        {
            value = (Peal.QueueNameTakenEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyQueuesEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyQueues(out Peal.TooManyQueuesEncoded? value)
    {
        if (Type == "TooManyQueues")
        {
            value = (Peal.TooManyQueuesEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.QueueNameTaken value) =>
        new(value);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.TooManyQueues value) =>
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
                "QueueNameTaken" => json.Deserialize<Peal.QueueNameTakenEncoded?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.QueueNameTakenEncoded"),
                "TooManyQueues" => jsonWithoutDiscriminator.Deserialize<Peal.TooManyQueuesEncoded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.TooManyQueuesEncoded"),
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
                    "QueueNameTaken" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyQueues" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for QueueNameTaken
    /// </summary>
    [Serializable]
    public struct QueueNameTaken
    {
        public QueueNameTaken(Peal.QueueNameTakenEncoded value)
        {
            Value = value;
        }

        internal Peal.QueueNameTakenEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.QueueNameTaken(
            Peal.QueueNameTakenEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyQueues
    /// </summary>
    [Serializable]
    public struct TooManyQueues
    {
        public TooManyQueues(Peal.TooManyQueuesEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyQueuesEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.TooManyQueues(
            Peal.TooManyQueuesEncoded value
        ) => new(value);
    }
}
