// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConnectOutcome.JsonConverter))]
[Serializable]
public record ConnectOutcome
{
    internal ConnectOutcome(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ConnectOutcome with <see cref="ConnectOutcome.Connected"/>.
    /// </summary>
    public ConnectOutcome(ConnectOutcome.Connected value)
    {
        Type = "connected";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConnectOutcome with <see cref="ConnectOutcome.Choose"/>.
    /// </summary>
    public ConnectOutcome(ConnectOutcome.Choose value)
    {
        Type = "choose";
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
    /// Returns true if <see cref="Type"/> is "connected"
    /// </summary>
    public bool IsConnected => Type == "connected";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "choose"
    /// </summary>
    public bool IsChoose => Type == "choose";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ConnectOutcomeConnected"/> if <see cref="Type"/> is 'connected', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'connected'.</exception>
    public Peal.ConnectOutcomeConnected AsConnected() =>
        IsConnected
            ? (Peal.ConnectOutcomeConnected)Value!
            : throw new global::System.Exception("ConnectOutcome.Type is not 'connected'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ConnectOutcomeChoose"/> if <see cref="Type"/> is 'choose', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'choose'.</exception>
    public Peal.ConnectOutcomeChoose AsChoose() =>
        IsChoose
            ? (Peal.ConnectOutcomeChoose)Value!
            : throw new global::System.Exception("ConnectOutcome.Type is not 'choose'");

    public T Match<T>(
        Func<Peal.ConnectOutcomeConnected, T> onConnected,
        Func<Peal.ConnectOutcomeChoose, T> onChoose,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "connected" => onConnected(AsConnected()),
            "choose" => onChoose(AsChoose()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ConnectOutcomeConnected> onConnected,
        Action<Peal.ConnectOutcomeChoose> onChoose,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "connected":
                onConnected(AsConnected());
                break;
            case "choose":
                onChoose(AsChoose());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ConnectOutcomeConnected"/> and returns true if successful.
    /// </summary>
    public bool TryAsConnected(out Peal.ConnectOutcomeConnected? value)
    {
        if (Type == "connected")
        {
            value = (Peal.ConnectOutcomeConnected)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ConnectOutcomeChoose"/> and returns true if successful.
    /// </summary>
    public bool TryAsChoose(out Peal.ConnectOutcomeChoose? value)
    {
        if (Type == "choose")
        {
            value = (Peal.ConnectOutcomeChoose)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConnectOutcome(ConnectOutcome.Connected value) => new(value);

    public static implicit operator ConnectOutcome(ConnectOutcome.Choose value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ConnectOutcome>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ConnectOutcome).IsAssignableFrom(typeToConvert);

        public override ConnectOutcome Read(
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
                "connected" => jsonWithoutDiscriminator.Deserialize<Peal.ConnectOutcomeConnected?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ConnectOutcomeConnected"),
                "choose" => jsonWithoutDiscriminator.Deserialize<Peal.ConnectOutcomeChoose?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ConnectOutcomeChoose"),
                _ => json.Deserialize<object?>(options),
            };
            return new ConnectOutcome(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConnectOutcome value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "connected" => JsonSerializer.SerializeToNode(value.Value, options),
                    "choose" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ConnectOutcome ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ConnectOutcome(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConnectOutcome value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for connected
    /// </summary>
    [Serializable]
    public struct Connected
    {
        public Connected(Peal.ConnectOutcomeConnected value)
        {
            Value = value;
        }

        internal Peal.ConnectOutcomeConnected Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConnectOutcome.Connected(
            Peal.ConnectOutcomeConnected value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for choose
    /// </summary>
    [Serializable]
    public struct Choose
    {
        public Choose(Peal.ConnectOutcomeChoose value)
        {
            Value = value;
        }

        internal Peal.ConnectOutcomeChoose Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConnectOutcome.Choose(Peal.ConnectOutcomeChoose value) =>
            new(value);
    }
}
