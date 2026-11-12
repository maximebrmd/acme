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
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.PostNotRecyclable"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.PostNotRecyclable value)
    {
        Type = "PostNotRecyclable";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.TooManyRecyclingRules"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.TooManyRecyclingRules value)
    {
        Type = "TooManyRecyclingRules";
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
    /// Returns true if <see cref="Type"/> is "PostNotRecyclable"
    /// </summary>
    public bool IsPostNotRecyclable => Type == "PostNotRecyclable";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyRecyclingRules"
    /// </summary>
    public bool IsTooManyRecyclingRules => Type == "TooManyRecyclingRules";

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostNotRecyclableEncoded"/> if <see cref="Type"/> is 'PostNotRecyclable', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostNotRecyclable'.</exception>
    public Peal.PostNotRecyclableEncoded AsPostNotRecyclable() =>
        IsPostNotRecyclable
            ? (Peal.PostNotRecyclableEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'PostNotRecyclable'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyRecyclingRulesEncoded"/> if <see cref="Type"/> is 'TooManyRecyclingRules', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyRecyclingRules'.</exception>
    public Peal.TooManyRecyclingRulesEncoded AsTooManyRecyclingRules() =>
        IsTooManyRecyclingRules
            ? (Peal.TooManyRecyclingRulesEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'TooManyRecyclingRules'"
            );

    public T Match<T>(
        Func<Peal.PostNotRecyclableEncoded, T> onPostNotRecyclable,
        Func<Peal.TooManyRecyclingRulesEncoded, T> onTooManyRecyclingRules,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "PostNotRecyclable" => onPostNotRecyclable(AsPostNotRecyclable()),
            "TooManyRecyclingRules" => onTooManyRecyclingRules(AsTooManyRecyclingRules()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.PostNotRecyclableEncoded> onPostNotRecyclable,
        Action<Peal.TooManyRecyclingRulesEncoded> onTooManyRecyclingRules,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "PostNotRecyclable":
                onPostNotRecyclable(AsPostNotRecyclable());
                break;
            case "TooManyRecyclingRules":
                onTooManyRecyclingRules(AsTooManyRecyclingRules());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostNotRecyclableEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostNotRecyclable(out Peal.PostNotRecyclableEncoded? value)
    {
        if (Type == "PostNotRecyclable")
        {
            value = (Peal.PostNotRecyclableEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyRecyclingRulesEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyRecyclingRules(out Peal.TooManyRecyclingRulesEncoded? value)
    {
        if (Type == "TooManyRecyclingRules")
        {
            value = (Peal.TooManyRecyclingRulesEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.PostNotRecyclable value) =>
        new(value);

    public static implicit operator ConflictErrorBody(
        ConflictErrorBody.TooManyRecyclingRules value
    ) => new(value);

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
                "PostNotRecyclable" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.PostNotRecyclableEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.PostNotRecyclableEncoded"
                        ),
                "TooManyRecyclingRules" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TooManyRecyclingRulesEncoded?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TooManyRecyclingRulesEncoded"
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
                    "PostNotRecyclable" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyRecyclingRules" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for PostNotRecyclable
    /// </summary>
    [Serializable]
    public struct PostNotRecyclable
    {
        public PostNotRecyclable(Peal.PostNotRecyclableEncoded value)
        {
            Value = value;
        }

        internal Peal.PostNotRecyclableEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.PostNotRecyclable(
            Peal.PostNotRecyclableEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyRecyclingRules
    /// </summary>
    [Serializable]
    public struct TooManyRecyclingRules
    {
        public TooManyRecyclingRules(Peal.TooManyRecyclingRulesEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyRecyclingRulesEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.TooManyRecyclingRules(
            Peal.TooManyRecyclingRulesEncoded value
        ) => new(value);
    }
}
