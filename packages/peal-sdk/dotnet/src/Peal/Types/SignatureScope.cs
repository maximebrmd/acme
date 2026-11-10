// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SignatureScope.JsonConverter))]
[Serializable]
public record SignatureScope
{
    internal SignatureScope(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of SignatureScope with <see cref="SignatureScope.Workspace"/>.
    /// </summary>
    public SignatureScope(SignatureScope.Workspace value)
    {
        Type = "workspace";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of SignatureScope with <see cref="SignatureScope.Platform"/>.
    /// </summary>
    public SignatureScope(SignatureScope.Platform value)
    {
        Type = "platform";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of SignatureScope with <see cref="SignatureScope.Channel"/>.
    /// </summary>
    public SignatureScope(SignatureScope.Channel value)
    {
        Type = "channel";
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
    /// Returns true if <see cref="Type"/> is "workspace"
    /// </summary>
    public bool IsWorkspace => Type == "workspace";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "platform"
    /// </summary>
    public bool IsPlatform => Type == "platform";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "channel"
    /// </summary>
    public bool IsChannel => Type == "channel";

    /// <summary>
    /// Returns the value as a <see cref="Peal.SignatureScopeWorkspace"/> if <see cref="Type"/> is 'workspace', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'workspace'.</exception>
    public Peal.SignatureScopeWorkspace AsWorkspace() =>
        IsWorkspace
            ? (Peal.SignatureScopeWorkspace)Value!
            : throw new global::System.Exception("SignatureScope.Type is not 'workspace'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.SignatureScopePlatform"/> if <see cref="Type"/> is 'platform', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'platform'.</exception>
    public Peal.SignatureScopePlatform AsPlatform() =>
        IsPlatform
            ? (Peal.SignatureScopePlatform)Value!
            : throw new global::System.Exception("SignatureScope.Type is not 'platform'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.SignatureScopeChannel"/> if <see cref="Type"/> is 'channel', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'channel'.</exception>
    public Peal.SignatureScopeChannel AsChannel() =>
        IsChannel
            ? (Peal.SignatureScopeChannel)Value!
            : throw new global::System.Exception("SignatureScope.Type is not 'channel'");

    public T Match<T>(
        Func<Peal.SignatureScopeWorkspace, T> onWorkspace,
        Func<Peal.SignatureScopePlatform, T> onPlatform,
        Func<Peal.SignatureScopeChannel, T> onChannel,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "workspace" => onWorkspace(AsWorkspace()),
            "platform" => onPlatform(AsPlatform()),
            "channel" => onChannel(AsChannel()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.SignatureScopeWorkspace> onWorkspace,
        Action<Peal.SignatureScopePlatform> onPlatform,
        Action<Peal.SignatureScopeChannel> onChannel,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "workspace":
                onWorkspace(AsWorkspace());
                break;
            case "platform":
                onPlatform(AsPlatform());
                break;
            case "channel":
                onChannel(AsChannel());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.SignatureScopeWorkspace"/> and returns true if successful.
    /// </summary>
    public bool TryAsWorkspace(out Peal.SignatureScopeWorkspace? value)
    {
        if (Type == "workspace")
        {
            value = (Peal.SignatureScopeWorkspace)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.SignatureScopePlatform"/> and returns true if successful.
    /// </summary>
    public bool TryAsPlatform(out Peal.SignatureScopePlatform? value)
    {
        if (Type == "platform")
        {
            value = (Peal.SignatureScopePlatform)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.SignatureScopeChannel"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannel(out Peal.SignatureScopeChannel? value)
    {
        if (Type == "channel")
        {
            value = (Peal.SignatureScopeChannel)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator SignatureScope(SignatureScope.Workspace value) => new(value);

    public static implicit operator SignatureScope(SignatureScope.Platform value) => new(value);

    public static implicit operator SignatureScope(SignatureScope.Channel value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<SignatureScope>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(SignatureScope).IsAssignableFrom(typeToConvert);

        public override SignatureScope Read(
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
                "workspace" => jsonWithoutDiscriminator.Deserialize<Peal.SignatureScopeWorkspace?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.SignatureScopeWorkspace"),
                "platform" => jsonWithoutDiscriminator.Deserialize<Peal.SignatureScopePlatform?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.SignatureScopePlatform"),
                "channel" => jsonWithoutDiscriminator.Deserialize<Peal.SignatureScopeChannel?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.SignatureScopeChannel"),
                _ => json.Deserialize<object?>(options),
            };
            return new SignatureScope(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SignatureScope value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "workspace" => JsonSerializer.SerializeToNode(value.Value, options),
                    "platform" => JsonSerializer.SerializeToNode(value.Value, options),
                    "channel" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override SignatureScope ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new SignatureScope(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SignatureScope value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for workspace
    /// </summary>
    [Serializable]
    public struct Workspace
    {
        public Workspace(Peal.SignatureScopeWorkspace value)
        {
            Value = value;
        }

        internal Peal.SignatureScopeWorkspace Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SignatureScope.Workspace(
            Peal.SignatureScopeWorkspace value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for platform
    /// </summary>
    [Serializable]
    public struct Platform
    {
        public Platform(Peal.SignatureScopePlatform value)
        {
            Value = value;
        }

        internal Peal.SignatureScopePlatform Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SignatureScope.Platform(
            Peal.SignatureScopePlatform value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for channel
    /// </summary>
    [Serializable]
    public struct Channel
    {
        public Channel(Peal.SignatureScopeChannel value)
        {
            Value = value;
        }

        internal Peal.SignatureScopeChannel Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator SignatureScope.Channel(Peal.SignatureScopeChannel value) =>
            new(value);
    }
}
