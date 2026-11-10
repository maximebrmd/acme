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
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.PostNotReviewable"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.PostNotReviewable value)
    {
        Type = "PostNotReviewable";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.TooManyReviewLinks"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.TooManyReviewLinks value)
    {
        Type = "TooManyReviewLinks";
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
    /// Returns true if <see cref="Type"/> is "PostNotReviewable"
    /// </summary>
    public bool IsPostNotReviewable => Type == "PostNotReviewable";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyReviewLinks"
    /// </summary>
    public bool IsTooManyReviewLinks => Type == "TooManyReviewLinks";

    /// <summary>
    /// Returns the value as a <see cref="Peal.PostNotReviewableEncoded"/> if <see cref="Type"/> is 'PostNotReviewable', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostNotReviewable'.</exception>
    public Peal.PostNotReviewableEncoded AsPostNotReviewable() =>
        IsPostNotReviewable
            ? (Peal.PostNotReviewableEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'PostNotReviewable'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyReviewLinksEncoded"/> if <see cref="Type"/> is 'TooManyReviewLinks', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyReviewLinks'.</exception>
    public Peal.TooManyReviewLinksEncoded AsTooManyReviewLinks() =>
        IsTooManyReviewLinks
            ? (Peal.TooManyReviewLinksEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'TooManyReviewLinks'"
            );

    public T Match<T>(
        Func<Peal.PostNotReviewableEncoded, T> onPostNotReviewable,
        Func<Peal.TooManyReviewLinksEncoded, T> onTooManyReviewLinks,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "PostNotReviewable" => onPostNotReviewable(AsPostNotReviewable()),
            "TooManyReviewLinks" => onTooManyReviewLinks(AsTooManyReviewLinks()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.PostNotReviewableEncoded> onPostNotReviewable,
        Action<Peal.TooManyReviewLinksEncoded> onTooManyReviewLinks,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "PostNotReviewable":
                onPostNotReviewable(AsPostNotReviewable());
                break;
            case "TooManyReviewLinks":
                onTooManyReviewLinks(AsTooManyReviewLinks());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PostNotReviewableEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostNotReviewable(out Peal.PostNotReviewableEncoded? value)
    {
        if (Type == "PostNotReviewable")
        {
            value = (Peal.PostNotReviewableEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyReviewLinksEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyReviewLinks(out Peal.TooManyReviewLinksEncoded? value)
    {
        if (Type == "TooManyReviewLinks")
        {
            value = (Peal.TooManyReviewLinksEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.PostNotReviewable value) =>
        new(value);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.TooManyReviewLinks value) =>
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
                "PostNotReviewable" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.PostNotReviewableEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.PostNotReviewableEncoded"
                        ),
                "TooManyReviewLinks" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TooManyReviewLinksEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TooManyReviewLinksEncoded"
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
                    "PostNotReviewable" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyReviewLinks" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for PostNotReviewable
    /// </summary>
    [Serializable]
    public struct PostNotReviewable
    {
        public PostNotReviewable(Peal.PostNotReviewableEncoded value)
        {
            Value = value;
        }

        internal Peal.PostNotReviewableEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.PostNotReviewable(
            Peal.PostNotReviewableEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyReviewLinks
    /// </summary>
    [Serializable]
    public struct TooManyReviewLinks
    {
        public TooManyReviewLinks(Peal.TooManyReviewLinksEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyReviewLinksEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.TooManyReviewLinks(
            Peal.TooManyReviewLinksEncoded value
        ) => new(value);
    }
}
