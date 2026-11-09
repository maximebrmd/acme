// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Suggestion.JsonConverter))]
[Serializable]
public record Suggestion
{
    internal Suggestion(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of Suggestion with <see cref="Suggestion.Text"/>.
    /// </summary>
    public Suggestion(Suggestion.Text value)
    {
        Type = "text";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of Suggestion with <see cref="Suggestion.Hashtags"/>.
    /// </summary>
    public Suggestion(Suggestion.Hashtags value)
    {
        Type = "hashtags";
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
    /// Returns true if <see cref="Type"/> is "text"
    /// </summary>
    public bool IsText => Type == "text";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "hashtags"
    /// </summary>
    public bool IsHashtags => Type == "hashtags";

    /// <summary>
    /// Returns the value as a <see cref="Peal.SuggestionText"/> if <see cref="Type"/> is 'text', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'text'.</exception>
    public Peal.SuggestionText AsText() =>
        IsText
            ? (Peal.SuggestionText)Value!
            : throw new global::System.Exception("Suggestion.Type is not 'text'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.SuggestionHashtags"/> if <see cref="Type"/> is 'hashtags', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'hashtags'.</exception>
    public Peal.SuggestionHashtags AsHashtags() =>
        IsHashtags
            ? (Peal.SuggestionHashtags)Value!
            : throw new global::System.Exception("Suggestion.Type is not 'hashtags'");

    public T Match<T>(
        Func<Peal.SuggestionText, T> onText,
        Func<Peal.SuggestionHashtags, T> onHashtags,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "text" => onText(AsText()),
            "hashtags" => onHashtags(AsHashtags()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.SuggestionText> onText,
        Action<Peal.SuggestionHashtags> onHashtags,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "text":
                onText(AsText());
                break;
            case "hashtags":
                onHashtags(AsHashtags());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.SuggestionText"/> and returns true if successful.
    /// </summary>
    public bool TryAsText(out Peal.SuggestionText? value)
    {
        if (Type == "text")
        {
            value = (Peal.SuggestionText)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.SuggestionHashtags"/> and returns true if successful.
    /// </summary>
    public bool TryAsHashtags(out Peal.SuggestionHashtags? value)
    {
        if (Type == "hashtags")
        {
            value = (Peal.SuggestionHashtags)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator Suggestion(Suggestion.Text value) => new(value);

    public static implicit operator Suggestion(Suggestion.Hashtags value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<Suggestion>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(Suggestion).IsAssignableFrom(typeToConvert);

        public override Suggestion Read(
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
                "text" => jsonWithoutDiscriminator.Deserialize<Peal.SuggestionText?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.SuggestionText"),
                "hashtags" => jsonWithoutDiscriminator.Deserialize<Peal.SuggestionHashtags?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.SuggestionHashtags"),
                _ => json.Deserialize<object?>(options),
            };
            return new Suggestion(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            Suggestion value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "text" => JsonSerializer.SerializeToNode(value.Value, options),
                    "hashtags" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override Suggestion ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new Suggestion(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Suggestion value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for text
    /// </summary>
    [Serializable]
    public struct Text
    {
        public Text(Peal.SuggestionText value)
        {
            Value = value;
        }

        internal Peal.SuggestionText Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator Suggestion.Text(Peal.SuggestionText value) => new(value);
    }

    /// <summary>
    /// Discriminated union type for hashtags
    /// </summary>
    [Serializable]
    public struct Hashtags
    {
        public Hashtags(Peal.SuggestionHashtags value)
        {
            Value = value;
        }

        internal Peal.SuggestionHashtags Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator Suggestion.Hashtags(Peal.SuggestionHashtags value) =>
            new(value);
    }
}
