// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ActivityActor.JsonConverter))]
[Serializable]
public record ActivityActor
{
    internal ActivityActor(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ActivityActor with <see cref="ActivityActor.User"/>.
    /// </summary>
    public ActivityActor(ActivityActor.User value)
    {
        Type = "user";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ActivityActor with <see cref="ActivityActor.ApiKey"/>.
    /// </summary>
    public ActivityActor(ActivityActor.ApiKey value)
    {
        Type = "apiKey";
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
    /// Returns the value as a <see cref="Peal.ActivityActorUser"/> if <see cref="Type"/> is 'user', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'user'.</exception>
    public Peal.ActivityActorUser AsUser() =>
        IsUser
            ? (Peal.ActivityActorUser)Value!
            : throw new global::System.Exception("ActivityActor.Type is not 'user'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ActivityActorApiKey"/> if <see cref="Type"/> is 'apiKey', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'apiKey'.</exception>
    public Peal.ActivityActorApiKey AsApiKey() =>
        IsApiKey
            ? (Peal.ActivityActorApiKey)Value!
            : throw new global::System.Exception("ActivityActor.Type is not 'apiKey'");

    public T Match<T>(
        Func<Peal.ActivityActorUser, T> onUser,
        Func<Peal.ActivityActorApiKey, T> onApiKey,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "user" => onUser(AsUser()),
            "apiKey" => onApiKey(AsApiKey()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ActivityActorUser> onUser,
        Action<Peal.ActivityActorApiKey> onApiKey,
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
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ActivityActorUser"/> and returns true if successful.
    /// </summary>
    public bool TryAsUser(out Peal.ActivityActorUser? value)
    {
        if (Type == "user")
        {
            value = (Peal.ActivityActorUser)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ActivityActorApiKey"/> and returns true if successful.
    /// </summary>
    public bool TryAsApiKey(out Peal.ActivityActorApiKey? value)
    {
        if (Type == "apiKey")
        {
            value = (Peal.ActivityActorApiKey)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ActivityActor(ActivityActor.User value) => new(value);

    public static implicit operator ActivityActor(ActivityActor.ApiKey value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ActivityActor>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ActivityActor).IsAssignableFrom(typeToConvert);

        public override ActivityActor Read(
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
                "user" => jsonWithoutDiscriminator.Deserialize<Peal.ActivityActorUser?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ActivityActorUser"),
                "apiKey" => jsonWithoutDiscriminator.Deserialize<Peal.ActivityActorApiKey?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ActivityActorApiKey"),
                _ => json.Deserialize<object?>(options),
            };
            return new ActivityActor(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ActivityActor value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "user" => JsonSerializer.SerializeToNode(value.Value, options),
                    "apiKey" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ActivityActor ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ActivityActor(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ActivityActor value,
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
        public User(Peal.ActivityActorUser value)
        {
            Value = value;
        }

        internal Peal.ActivityActorUser Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ActivityActor.User(Peal.ActivityActorUser value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for apiKey
    /// </summary>
    [Serializable]
    public struct ApiKey
    {
        public ApiKey(Peal.ActivityActorApiKey value)
        {
            Value = value;
        }

        internal Peal.ActivityActorApiKey Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ActivityActor.ApiKey(Peal.ActivityActorApiKey value) =>
            new(value);
    }
}
