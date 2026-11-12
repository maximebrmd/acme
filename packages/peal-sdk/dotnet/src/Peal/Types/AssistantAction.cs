// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantAction.JsonConverter))]
[Serializable]
public record AssistantAction
{
    internal AssistantAction(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of AssistantAction with <see cref="AssistantAction.Rewrite"/>.
    /// </summary>
    public AssistantAction(AssistantAction.Rewrite value)
    {
        Type = "rewrite";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AssistantAction with <see cref="AssistantAction.Shorten"/>.
    /// </summary>
    public AssistantAction(AssistantAction.Shorten value)
    {
        Type = "shorten";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AssistantAction with <see cref="AssistantAction.Translate"/>.
    /// </summary>
    public AssistantAction(AssistantAction.Translate value)
    {
        Type = "translate";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AssistantAction with <see cref="AssistantAction.Hashtags"/>.
    /// </summary>
    public AssistantAction(AssistantAction.Hashtags value)
    {
        Type = "hashtags";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AssistantAction with <see cref="AssistantAction.Write"/>.
    /// </summary>
    public AssistantAction(AssistantAction.Write value)
    {
        Type = "write";
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
    /// Returns true if <see cref="Type"/> is "rewrite"
    /// </summary>
    public bool IsRewrite => Type == "rewrite";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "shorten"
    /// </summary>
    public bool IsShorten => Type == "shorten";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "translate"
    /// </summary>
    public bool IsTranslate => Type == "translate";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "hashtags"
    /// </summary>
    public bool IsHashtags => Type == "hashtags";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "write"
    /// </summary>
    public bool IsWrite => Type == "write";

    /// <summary>
    /// Returns the value as a <see cref="Peal.AssistantActionRewrite"/> if <see cref="Type"/> is 'rewrite', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'rewrite'.</exception>
    public Peal.AssistantActionRewrite AsRewrite() =>
        IsRewrite
            ? (Peal.AssistantActionRewrite)Value!
            : throw new global::System.Exception("AssistantAction.Type is not 'rewrite'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AssistantActionShorten"/> if <see cref="Type"/> is 'shorten', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'shorten'.</exception>
    public Peal.AssistantActionShorten AsShorten() =>
        IsShorten
            ? (Peal.AssistantActionShorten)Value!
            : throw new global::System.Exception("AssistantAction.Type is not 'shorten'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AssistantActionTranslate"/> if <see cref="Type"/> is 'translate', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'translate'.</exception>
    public Peal.AssistantActionTranslate AsTranslate() =>
        IsTranslate
            ? (Peal.AssistantActionTranslate)Value!
            : throw new global::System.Exception("AssistantAction.Type is not 'translate'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AssistantActionHashtags"/> if <see cref="Type"/> is 'hashtags', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'hashtags'.</exception>
    public Peal.AssistantActionHashtags AsHashtags() =>
        IsHashtags
            ? (Peal.AssistantActionHashtags)Value!
            : throw new global::System.Exception("AssistantAction.Type is not 'hashtags'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AssistantActionWrite"/> if <see cref="Type"/> is 'write', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'write'.</exception>
    public Peal.AssistantActionWrite AsWrite() =>
        IsWrite
            ? (Peal.AssistantActionWrite)Value!
            : throw new global::System.Exception("AssistantAction.Type is not 'write'");

    public T Match<T>(
        Func<Peal.AssistantActionRewrite, T> onRewrite,
        Func<Peal.AssistantActionShorten, T> onShorten,
        Func<Peal.AssistantActionTranslate, T> onTranslate,
        Func<Peal.AssistantActionHashtags, T> onHashtags,
        Func<Peal.AssistantActionWrite, T> onWrite,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "rewrite" => onRewrite(AsRewrite()),
            "shorten" => onShorten(AsShorten()),
            "translate" => onTranslate(AsTranslate()),
            "hashtags" => onHashtags(AsHashtags()),
            "write" => onWrite(AsWrite()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.AssistantActionRewrite> onRewrite,
        Action<Peal.AssistantActionShorten> onShorten,
        Action<Peal.AssistantActionTranslate> onTranslate,
        Action<Peal.AssistantActionHashtags> onHashtags,
        Action<Peal.AssistantActionWrite> onWrite,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "rewrite":
                onRewrite(AsRewrite());
                break;
            case "shorten":
                onShorten(AsShorten());
                break;
            case "translate":
                onTranslate(AsTranslate());
                break;
            case "hashtags":
                onHashtags(AsHashtags());
                break;
            case "write":
                onWrite(AsWrite());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AssistantActionRewrite"/> and returns true if successful.
    /// </summary>
    public bool TryAsRewrite(out Peal.AssistantActionRewrite? value)
    {
        if (Type == "rewrite")
        {
            value = (Peal.AssistantActionRewrite)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AssistantActionShorten"/> and returns true if successful.
    /// </summary>
    public bool TryAsShorten(out Peal.AssistantActionShorten? value)
    {
        if (Type == "shorten")
        {
            value = (Peal.AssistantActionShorten)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AssistantActionTranslate"/> and returns true if successful.
    /// </summary>
    public bool TryAsTranslate(out Peal.AssistantActionTranslate? value)
    {
        if (Type == "translate")
        {
            value = (Peal.AssistantActionTranslate)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AssistantActionHashtags"/> and returns true if successful.
    /// </summary>
    public bool TryAsHashtags(out Peal.AssistantActionHashtags? value)
    {
        if (Type == "hashtags")
        {
            value = (Peal.AssistantActionHashtags)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AssistantActionWrite"/> and returns true if successful.
    /// </summary>
    public bool TryAsWrite(out Peal.AssistantActionWrite? value)
    {
        if (Type == "write")
        {
            value = (Peal.AssistantActionWrite)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator AssistantAction(AssistantAction.Rewrite value) => new(value);

    public static implicit operator AssistantAction(AssistantAction.Shorten value) => new(value);

    public static implicit operator AssistantAction(AssistantAction.Translate value) => new(value);

    public static implicit operator AssistantAction(AssistantAction.Hashtags value) => new(value);

    public static implicit operator AssistantAction(AssistantAction.Write value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<AssistantAction>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(AssistantAction).IsAssignableFrom(typeToConvert);

        public override AssistantAction Read(
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
                "rewrite" => jsonWithoutDiscriminator.Deserialize<Peal.AssistantActionRewrite?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.AssistantActionRewrite"),
                "shorten" => jsonWithoutDiscriminator.Deserialize<Peal.AssistantActionShorten?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.AssistantActionShorten"),
                "translate" => jsonWithoutDiscriminator.Deserialize<Peal.AssistantActionTranslate?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.AssistantActionTranslate"),
                "hashtags" => jsonWithoutDiscriminator.Deserialize<Peal.AssistantActionHashtags?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.AssistantActionHashtags"),
                "write" => jsonWithoutDiscriminator.Deserialize<Peal.AssistantActionWrite?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.AssistantActionWrite"),
                _ => json.Deserialize<object?>(options),
            };
            return new AssistantAction(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantAction value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "rewrite" => JsonSerializer.SerializeToNode(value.Value, options),
                    "shorten" => JsonSerializer.SerializeToNode(value.Value, options),
                    "translate" => JsonSerializer.SerializeToNode(value.Value, options),
                    "hashtags" => JsonSerializer.SerializeToNode(value.Value, options),
                    "write" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override AssistantAction ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new AssistantAction(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantAction value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for rewrite
    /// </summary>
    [Serializable]
    public struct Rewrite
    {
        public Rewrite(Peal.AssistantActionRewrite value)
        {
            Value = value;
        }

        internal Peal.AssistantActionRewrite Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AssistantAction.Rewrite(
            Peal.AssistantActionRewrite value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for shorten
    /// </summary>
    [Serializable]
    public struct Shorten
    {
        public Shorten(Peal.AssistantActionShorten value)
        {
            Value = value;
        }

        internal Peal.AssistantActionShorten Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AssistantAction.Shorten(
            Peal.AssistantActionShorten value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for translate
    /// </summary>
    [Serializable]
    public struct Translate
    {
        public Translate(Peal.AssistantActionTranslate value)
        {
            Value = value;
        }

        internal Peal.AssistantActionTranslate Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AssistantAction.Translate(
            Peal.AssistantActionTranslate value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for hashtags
    /// </summary>
    [Serializable]
    public struct Hashtags
    {
        public Hashtags(Peal.AssistantActionHashtags value)
        {
            Value = value;
        }

        internal Peal.AssistantActionHashtags Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AssistantAction.Hashtags(
            Peal.AssistantActionHashtags value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for write
    /// </summary>
    [Serializable]
    public struct Write
    {
        public Write(Peal.AssistantActionWrite value)
        {
            Value = value;
        }

        internal Peal.AssistantActionWrite Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AssistantAction.Write(Peal.AssistantActionWrite value) =>
            new(value);
    }
}
