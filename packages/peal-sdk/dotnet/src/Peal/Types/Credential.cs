// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Credential.JsonConverter))]
[Serializable]
public record Credential
{
    internal Credential(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of Credential with <see cref="Credential.User"/>.
    /// </summary>
    public Credential(Credential.User value)
    {
        Type = "user";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of Credential with <see cref="Credential.ApiKey"/>.
    /// </summary>
    public Credential(Credential.ApiKey value)
    {
        Type = "apiKey";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of Credential with <see cref="Credential.PartnerKey"/>.
    /// </summary>
    public Credential(Credential.PartnerKey value)
    {
        Type = "partnerKey";
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
    /// Returns true if <see cref="Type"/> is "user"
    /// </summary>
    public bool IsUser => Type == "user";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "apiKey"
    /// </summary>
    public bool IsApiKey => Type == "apiKey";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "partnerKey"
    /// </summary>
    public bool IsPartnerKey => Type == "partnerKey";

    /// <summary>
    /// Returns the value as a <see cref="Peal.CredentialUser"/> if <see cref="Type"/> is 'user', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'user'.</exception>
    public Peal.CredentialUser AsUser() =>
        IsUser
            ? (Peal.CredentialUser)Value!
            : throw new global::System.Exception("Credential.Type is not 'user'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.CredentialApiKey"/> if <see cref="Type"/> is 'apiKey', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'apiKey'.</exception>
    public Peal.CredentialApiKey AsApiKey() =>
        IsApiKey
            ? (Peal.CredentialApiKey)Value!
            : throw new global::System.Exception("Credential.Type is not 'apiKey'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.CredentialPartnerKey"/> if <see cref="Type"/> is 'partnerKey', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'partnerKey'.</exception>
    public Peal.CredentialPartnerKey AsPartnerKey() =>
        IsPartnerKey
            ? (Peal.CredentialPartnerKey)Value!
            : throw new global::System.Exception("Credential.Type is not 'partnerKey'");

    public T Match<T>(
        Func<Peal.CredentialUser, T> onUser,
        Func<Peal.CredentialApiKey, T> onApiKey,
        Func<Peal.CredentialPartnerKey, T> onPartnerKey,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "user" => onUser(AsUser()),
            "apiKey" => onApiKey(AsApiKey()),
            "partnerKey" => onPartnerKey(AsPartnerKey()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.CredentialUser> onUser,
        Action<Peal.CredentialApiKey> onApiKey,
        Action<Peal.CredentialPartnerKey> onPartnerKey,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "user":
                onUser(AsUser());
                break;
            case "apiKey":
                onApiKey(AsApiKey());
                break;
            case "partnerKey":
                onPartnerKey(AsPartnerKey());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.CredentialUser"/> and returns true if successful.
    /// </summary>
    public bool TryAsUser(out Peal.CredentialUser? value)
    {
        if (Type == "user")
        {
            value = (Peal.CredentialUser)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.CredentialApiKey"/> and returns true if successful.
    /// </summary>
    public bool TryAsApiKey(out Peal.CredentialApiKey? value)
    {
        if (Type == "apiKey")
        {
            value = (Peal.CredentialApiKey)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.CredentialPartnerKey"/> and returns true if successful.
    /// </summary>
    public bool TryAsPartnerKey(out Peal.CredentialPartnerKey? value)
    {
        if (Type == "partnerKey")
        {
            value = (Peal.CredentialPartnerKey)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator Credential(Credential.User value) => new(value);

    public static implicit operator Credential(Credential.ApiKey value) => new(value);

    public static implicit operator Credential(Credential.PartnerKey value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<Credential>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(Credential).IsAssignableFrom(typeToConvert);

        public override Credential Read(
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
                "user" => jsonWithoutDiscriminator.Deserialize<Peal.CredentialUser?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.CredentialUser"),
                "apiKey" => jsonWithoutDiscriminator.Deserialize<Peal.CredentialApiKey?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.CredentialApiKey"),
                "partnerKey" => jsonWithoutDiscriminator.Deserialize<Peal.CredentialPartnerKey?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.CredentialPartnerKey"),
                _ => json.Deserialize<object?>(options),
            };
            return new Credential(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            Credential value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "user" => JsonSerializer.SerializeToNode(value.Value, options),
                    "apiKey" => JsonSerializer.SerializeToNode(value.Value, options),
                    "partnerKey" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override Credential ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new Credential(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Credential value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for user
    /// </summary>
    [Serializable]
    public struct User
    {
        public User(Peal.CredentialUser value)
        {
            Value = value;
        }

        internal Peal.CredentialUser Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator Credential.User(Peal.CredentialUser value) => new(value);
    }

    /// <summary>
    /// Discriminated union type for apiKey
    /// </summary>
    [Serializable]
    public struct ApiKey
    {
        public ApiKey(Peal.CredentialApiKey value)
        {
            Value = value;
        }

        internal Peal.CredentialApiKey Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator Credential.ApiKey(Peal.CredentialApiKey value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for partnerKey
    /// </summary>
    [Serializable]
    public struct PartnerKey
    {
        public PartnerKey(Peal.CredentialPartnerKey value)
        {
            Value = value;
        }

        internal Peal.CredentialPartnerKey Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator Credential.PartnerKey(Peal.CredentialPartnerKey value) =>
            new(value);
    }
}
