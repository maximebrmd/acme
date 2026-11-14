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
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.FollowUpRuleTaken"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.FollowUpRuleTaken value)
    {
        Type = "FollowUpRuleTaken";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ConflictErrorBody with <see cref="ConflictErrorBody.TooManyFollowUpRules"/>.
    /// </summary>
    public ConflictErrorBody(ConflictErrorBody.TooManyFollowUpRules value)
    {
        Type = "TooManyFollowUpRules";
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
    /// Returns true if <see cref="Type"/> is "FollowUpRuleTaken"
    /// </summary>
    public bool IsFollowUpRuleTaken => Type == "FollowUpRuleTaken";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TooManyFollowUpRules"
    /// </summary>
    public bool IsTooManyFollowUpRules => Type == "TooManyFollowUpRules";

    /// <summary>
    /// Returns the value as a <see cref="Peal.FollowUpRuleTakenEncoded"/> if <see cref="Type"/> is 'FollowUpRuleTaken', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'FollowUpRuleTaken'.</exception>
    public Peal.FollowUpRuleTakenEncoded AsFollowUpRuleTaken() =>
        IsFollowUpRuleTaken
            ? (Peal.FollowUpRuleTakenEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'FollowUpRuleTaken'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.TooManyFollowUpRulesEncoded"/> if <see cref="Type"/> is 'TooManyFollowUpRules', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TooManyFollowUpRules'.</exception>
    public Peal.TooManyFollowUpRulesEncoded AsTooManyFollowUpRules() =>
        IsTooManyFollowUpRules
            ? (Peal.TooManyFollowUpRulesEncoded)Value!
            : throw new global::System.Exception(
                "ConflictErrorBody.Type is not 'TooManyFollowUpRules'"
            );

    public T Match<T>(
        Func<Peal.FollowUpRuleTakenEncoded, T> onFollowUpRuleTaken,
        Func<Peal.TooManyFollowUpRulesEncoded, T> onTooManyFollowUpRules,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "FollowUpRuleTaken" => onFollowUpRuleTaken(AsFollowUpRuleTaken()),
            "TooManyFollowUpRules" => onTooManyFollowUpRules(AsTooManyFollowUpRules()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.FollowUpRuleTakenEncoded> onFollowUpRuleTaken,
        Action<Peal.TooManyFollowUpRulesEncoded> onTooManyFollowUpRules,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "FollowUpRuleTaken":
                onFollowUpRuleTaken(AsFollowUpRuleTaken());
                break;
            case "TooManyFollowUpRules":
                onTooManyFollowUpRules(AsTooManyFollowUpRules());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.FollowUpRuleTakenEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsFollowUpRuleTaken(out Peal.FollowUpRuleTakenEncoded? value)
    {
        if (Type == "FollowUpRuleTaken")
        {
            value = (Peal.FollowUpRuleTakenEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TooManyFollowUpRulesEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsTooManyFollowUpRules(out Peal.TooManyFollowUpRulesEncoded? value)
    {
        if (Type == "TooManyFollowUpRules")
        {
            value = (Peal.TooManyFollowUpRulesEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ConflictErrorBody(ConflictErrorBody.FollowUpRuleTaken value) =>
        new(value);

    public static implicit operator ConflictErrorBody(
        ConflictErrorBody.TooManyFollowUpRules value
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
                "FollowUpRuleTaken" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.FollowUpRuleTakenEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.FollowUpRuleTakenEncoded"
                        ),
                "TooManyFollowUpRules" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TooManyFollowUpRulesEncoded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TooManyFollowUpRulesEncoded"
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
                    "FollowUpRuleTaken" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TooManyFollowUpRules" => JsonSerializer.SerializeToNode(value.Value, options),
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
    /// Discriminated union type for FollowUpRuleTaken
    /// </summary>
    [Serializable]
    public struct FollowUpRuleTaken
    {
        public FollowUpRuleTaken(Peal.FollowUpRuleTakenEncoded value)
        {
            Value = value;
        }

        internal Peal.FollowUpRuleTakenEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.FollowUpRuleTaken(
            Peal.FollowUpRuleTakenEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TooManyFollowUpRules
    /// </summary>
    [Serializable]
    public struct TooManyFollowUpRules
    {
        public TooManyFollowUpRules(Peal.TooManyFollowUpRulesEncoded value)
        {
            Value = value;
        }

        internal Peal.TooManyFollowUpRulesEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ConflictErrorBody.TooManyFollowUpRules(
            Peal.TooManyFollowUpRulesEncoded value
        ) => new(value);
    }
}
