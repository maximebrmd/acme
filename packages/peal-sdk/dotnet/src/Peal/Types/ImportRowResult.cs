// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImportRowResult.JsonConverter))]
[Serializable]
public record ImportRowResult
{
    internal ImportRowResult(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ImportRowResult with <see cref="ImportRowResult.Created"/>.
    /// </summary>
    public ImportRowResult(ImportRowResult.Created value)
    {
        Type = "created";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ImportRowResult with <see cref="ImportRowResult.Valid"/>.
    /// </summary>
    public ImportRowResult(ImportRowResult.Valid value)
    {
        Type = "valid";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ImportRowResult with <see cref="ImportRowResult.Refused"/>.
    /// </summary>
    public ImportRowResult(ImportRowResult.Refused value)
    {
        Type = "refused";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ImportRowResult with <see cref="ImportRowResult.Unreadable"/>.
    /// </summary>
    public ImportRowResult(ImportRowResult.Unreadable value)
    {
        Type = "unreadable";
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
    /// Returns true if <see cref="Type"/> is "valid"
    /// </summary>
    public bool IsValid => Type == "valid";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "refused"
    /// </summary>
    public bool IsRefused => Type == "refused";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "unreadable"
    /// </summary>
    public bool IsUnreadable => Type == "unreadable";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ImportRowResultCreated"/> if <see cref="Type"/> is 'created', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'created'.</exception>
    public Peal.ImportRowResultCreated AsCreated() =>
        IsCreated
            ? (Peal.ImportRowResultCreated)Value!
            : throw new global::System.Exception("ImportRowResult.Type is not 'created'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ImportRowResultValid"/> if <see cref="Type"/> is 'valid', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'valid'.</exception>
    public Peal.ImportRowResultValid AsValid() =>
        IsValid
            ? (Peal.ImportRowResultValid)Value!
            : throw new global::System.Exception("ImportRowResult.Type is not 'valid'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ImportRowResultRefused"/> if <see cref="Type"/> is 'refused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'refused'.</exception>
    public Peal.ImportRowResultRefused AsRefused() =>
        IsRefused
            ? (Peal.ImportRowResultRefused)Value!
            : throw new global::System.Exception("ImportRowResult.Type is not 'refused'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ImportRowResultUnreadable"/> if <see cref="Type"/> is 'unreadable', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'unreadable'.</exception>
    public Peal.ImportRowResultUnreadable AsUnreadable() =>
        IsUnreadable
            ? (Peal.ImportRowResultUnreadable)Value!
            : throw new global::System.Exception("ImportRowResult.Type is not 'unreadable'");

    public T Match<T>(
        Func<Peal.ImportRowResultCreated, T> onCreated,
        Func<Peal.ImportRowResultValid, T> onValid,
        Func<Peal.ImportRowResultRefused, T> onRefused,
        Func<Peal.ImportRowResultUnreadable, T> onUnreadable,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "created" => onCreated(AsCreated()),
            "valid" => onValid(AsValid()),
            "refused" => onRefused(AsRefused()),
            "unreadable" => onUnreadable(AsUnreadable()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ImportRowResultCreated> onCreated,
        Action<Peal.ImportRowResultValid> onValid,
        Action<Peal.ImportRowResultRefused> onRefused,
        Action<Peal.ImportRowResultUnreadable> onUnreadable,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "created":
                onCreated(AsCreated());
                break;
            case "valid":
                onValid(AsValid());
                break;
            case "refused":
                onRefused(AsRefused());
                break;
            case "unreadable":
                onUnreadable(AsUnreadable());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ImportRowResultCreated"/> and returns true if successful.
    /// </summary>
    public bool TryAsCreated(out Peal.ImportRowResultCreated? value)
    {
        if (Type == "created")
        {
            value = (Peal.ImportRowResultCreated)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ImportRowResultValid"/> and returns true if successful.
    /// </summary>
    public bool TryAsValid(out Peal.ImportRowResultValid? value)
    {
        if (Type == "valid")
        {
            value = (Peal.ImportRowResultValid)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ImportRowResultRefused"/> and returns true if successful.
    /// </summary>
    public bool TryAsRefused(out Peal.ImportRowResultRefused? value)
    {
        if (Type == "refused")
        {
            value = (Peal.ImportRowResultRefused)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ImportRowResultUnreadable"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnreadable(out Peal.ImportRowResultUnreadable? value)
    {
        if (Type == "unreadable")
        {
            value = (Peal.ImportRowResultUnreadable)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ImportRowResult(ImportRowResult.Created value) => new(value);

    public static implicit operator ImportRowResult(ImportRowResult.Valid value) => new(value);

    public static implicit operator ImportRowResult(ImportRowResult.Refused value) => new(value);

    public static implicit operator ImportRowResult(ImportRowResult.Unreadable value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ImportRowResult>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ImportRowResult).IsAssignableFrom(typeToConvert);

        public override ImportRowResult Read(
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
                "created" => jsonWithoutDiscriminator.Deserialize<Peal.ImportRowResultCreated?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ImportRowResultCreated"),
                "valid" => jsonWithoutDiscriminator.Deserialize<Peal.ImportRowResultValid?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ImportRowResultValid"),
                "refused" => jsonWithoutDiscriminator.Deserialize<Peal.ImportRowResultRefused?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ImportRowResultRefused"),
                "unreadable" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ImportRowResultUnreadable?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ImportRowResultUnreadable"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new ImportRowResult(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImportRowResult value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "created" => JsonSerializer.SerializeToNode(value.Value, options),
                    "valid" => JsonSerializer.SerializeToNode(value.Value, options),
                    "refused" => JsonSerializer.SerializeToNode(value.Value, options),
                    "unreadable" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ImportRowResult ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ImportRowResult(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImportRowResult value,
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
        public Created(Peal.ImportRowResultCreated value)
        {
            Value = value;
        }

        internal Peal.ImportRowResultCreated Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ImportRowResult.Created(
            Peal.ImportRowResultCreated value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for valid
    /// </summary>
    [Serializable]
    public struct Valid
    {
        public Valid(Peal.ImportRowResultValid value)
        {
            Value = value;
        }

        internal Peal.ImportRowResultValid Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ImportRowResult.Valid(Peal.ImportRowResultValid value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for refused
    /// </summary>
    [Serializable]
    public struct Refused
    {
        public Refused(Peal.ImportRowResultRefused value)
        {
            Value = value;
        }

        internal Peal.ImportRowResultRefused Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ImportRowResult.Refused(
            Peal.ImportRowResultRefused value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for unreadable
    /// </summary>
    [Serializable]
    public struct Unreadable
    {
        public Unreadable(Peal.ImportRowResultUnreadable value)
        {
            Value = value;
        }

        internal Peal.ImportRowResultUnreadable Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ImportRowResult.Unreadable(
            Peal.ImportRowResultUnreadable value
        ) => new(value);
    }
}
