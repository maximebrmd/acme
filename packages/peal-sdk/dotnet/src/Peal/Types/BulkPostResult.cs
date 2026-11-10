// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BulkPostResult.JsonConverter))]
[Serializable]
public record BulkPostResult
{
    internal BulkPostResult(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of BulkPostResult with <see cref="BulkPostResult.Created"/>.
    /// </summary>
    public BulkPostResult(BulkPostResult.Created value)
    {
        Type = "created";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of BulkPostResult with <see cref="BulkPostResult.Refused"/>.
    /// </summary>
    public BulkPostResult(BulkPostResult.Refused value)
    {
        Type = "refused";
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
    /// Returns true if <see cref="Type"/> is "created"
    /// </summary>
    public bool IsCreated => Type == "created";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "refused"
    /// </summary>
    public bool IsRefused => Type == "refused";

    /// <summary>
    /// Returns the value as a <see cref="Peal.BulkPostResultCreated"/> if <see cref="Type"/> is 'created', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'created'.</exception>
    public Peal.BulkPostResultCreated AsCreated() =>
        IsCreated
            ? (Peal.BulkPostResultCreated)Value!
            : throw new global::System.Exception("BulkPostResult.Type is not 'created'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.BulkPostResultRefused"/> if <see cref="Type"/> is 'refused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'refused'.</exception>
    public Peal.BulkPostResultRefused AsRefused() =>
        IsRefused
            ? (Peal.BulkPostResultRefused)Value!
            : throw new global::System.Exception("BulkPostResult.Type is not 'refused'");

    public T Match<T>(
        Func<Peal.BulkPostResultCreated, T> onCreated,
        Func<Peal.BulkPostResultRefused, T> onRefused,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "created" => onCreated(AsCreated()),
            "refused" => onRefused(AsRefused()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.BulkPostResultCreated> onCreated,
        Action<Peal.BulkPostResultRefused> onRefused,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "created":
                onCreated(AsCreated());
                break;
            case "refused":
                onRefused(AsRefused());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.BulkPostResultCreated"/> and returns true if successful.
    /// </summary>
    public bool TryAsCreated(out Peal.BulkPostResultCreated? value)
    {
        if (Type == "created")
        {
            value = (Peal.BulkPostResultCreated)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.BulkPostResultRefused"/> and returns true if successful.
    /// </summary>
    public bool TryAsRefused(out Peal.BulkPostResultRefused? value)
    {
        if (Type == "refused")
        {
            value = (Peal.BulkPostResultRefused)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator BulkPostResult(BulkPostResult.Created value) => new(value);

    public static implicit operator BulkPostResult(BulkPostResult.Refused value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<BulkPostResult>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(BulkPostResult).IsAssignableFrom(typeToConvert);

        public override BulkPostResult Read(
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
                "created" => jsonWithoutDiscriminator.Deserialize<Peal.BulkPostResultCreated?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.BulkPostResultCreated"),
                "refused" => jsonWithoutDiscriminator.Deserialize<Peal.BulkPostResultRefused?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.BulkPostResultRefused"),
                _ => json.Deserialize<object?>(options),
            };
            return new BulkPostResult(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BulkPostResult value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "created" => JsonSerializer.SerializeToNode(value.Value, options),
                    "refused" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override BulkPostResult ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new BulkPostResult(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BulkPostResult value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for created
    /// </summary>
    [Serializable]
    public struct Created
    {
        public Created(Peal.BulkPostResultCreated value)
        {
            Value = value;
        }

        internal Peal.BulkPostResultCreated Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator BulkPostResult.Created(Peal.BulkPostResultCreated value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for refused
    /// </summary>
    [Serializable]
    public struct Refused
    {
        public Refused(Peal.BulkPostResultRefused value)
        {
            Value = value;
        }

        internal Peal.BulkPostResultRefused Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator BulkPostResult.Refused(Peal.BulkPostResultRefused value) =>
            new(value);
    }
}
