// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AccountStanding.JsonConverter))]
[Serializable]
public record AccountStanding
{
    internal AccountStanding(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of AccountStanding with <see cref="AccountStanding.Unrestricted"/>.
    /// </summary>
    public AccountStanding(AccountStanding.Unrestricted value)
    {
        Type = "unrestricted";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AccountStanding with <see cref="AccountStanding.Read"/>.
    /// </summary>
    public AccountStanding(AccountStanding.Read value)
    {
        Type = "read";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AccountStanding with <see cref="AccountStanding.Unread"/>.
    /// </summary>
    public AccountStanding(AccountStanding.Unread value)
    {
        Type = "unread";
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
    /// Returns true if <see cref="Type"/> is "unrestricted"
    /// </summary>
    public bool IsUnrestricted => Type == "unrestricted";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "read"
    /// </summary>
    public bool IsRead => Type == "read";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "unread"
    /// </summary>
    public bool IsUnread => Type == "unread";

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountStandingUnrestricted"/> if <see cref="Type"/> is 'unrestricted', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'unrestricted'.</exception>
    public Peal.AccountStandingUnrestricted AsUnrestricted() =>
        IsUnrestricted
            ? (Peal.AccountStandingUnrestricted)Value!
            : throw new global::System.Exception("AccountStanding.Type is not 'unrestricted'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountStandingRead"/> if <see cref="Type"/> is 'read', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'read'.</exception>
    public Peal.AccountStandingRead AsRead() =>
        IsRead
            ? (Peal.AccountStandingRead)Value!
            : throw new global::System.Exception("AccountStanding.Type is not 'read'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountStandingUnread"/> if <see cref="Type"/> is 'unread', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'unread'.</exception>
    public Peal.AccountStandingUnread AsUnread() =>
        IsUnread
            ? (Peal.AccountStandingUnread)Value!
            : throw new global::System.Exception("AccountStanding.Type is not 'unread'");

    public T Match<T>(
        Func<Peal.AccountStandingUnrestricted, T> onUnrestricted,
        Func<Peal.AccountStandingRead, T> onRead,
        Func<Peal.AccountStandingUnread, T> onUnread,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "unrestricted" => onUnrestricted(AsUnrestricted()),
            "read" => onRead(AsRead()),
            "unread" => onUnread(AsUnread()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.AccountStandingUnrestricted> onUnrestricted,
        Action<Peal.AccountStandingRead> onRead,
        Action<Peal.AccountStandingUnread> onUnread,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "unrestricted":
                onUnrestricted(AsUnrestricted());
                break;
            case "read":
                onRead(AsRead());
                break;
            case "unread":
                onUnread(AsUnread());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountStandingUnrestricted"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnrestricted(out Peal.AccountStandingUnrestricted? value)
    {
        if (Type == "unrestricted")
        {
            value = (Peal.AccountStandingUnrestricted)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountStandingRead"/> and returns true if successful.
    /// </summary>
    public bool TryAsRead(out Peal.AccountStandingRead? value)
    {
        if (Type == "read")
        {
            value = (Peal.AccountStandingRead)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountStandingUnread"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnread(out Peal.AccountStandingUnread? value)
    {
        if (Type == "unread")
        {
            value = (Peal.AccountStandingUnread)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator AccountStanding(AccountStanding.Unrestricted value) =>
        new(value);

    public static implicit operator AccountStanding(AccountStanding.Read value) => new(value);

    public static implicit operator AccountStanding(AccountStanding.Unread value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<AccountStanding>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(AccountStanding).IsAssignableFrom(typeToConvert);

        public override AccountStanding Read(
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
                "unrestricted" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.AccountStandingUnrestricted?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.AccountStandingUnrestricted"
                        ),
                "read" => jsonWithoutDiscriminator.Deserialize<Peal.AccountStandingRead?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.AccountStandingRead"),
                "unread" => jsonWithoutDiscriminator.Deserialize<Peal.AccountStandingUnread?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.AccountStandingUnread"),
                _ => json.Deserialize<object?>(options),
            };
            return new AccountStanding(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AccountStanding value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "unrestricted" => JsonSerializer.SerializeToNode(value.Value, options),
                    "read" => JsonSerializer.SerializeToNode(value.Value, options),
                    "unread" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override AccountStanding ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new AccountStanding(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AccountStanding value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for unrestricted
    /// </summary>
    [Serializable]
    public struct Unrestricted
    {
        public Unrestricted(Peal.AccountStandingUnrestricted value)
        {
            Value = value;
        }

        internal Peal.AccountStandingUnrestricted Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountStanding.Unrestricted(
            Peal.AccountStandingUnrestricted value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for read
    /// </summary>
    [Serializable]
    public struct Read
    {
        public Read(Peal.AccountStandingRead value)
        {
            Value = value;
        }

        internal Peal.AccountStandingRead Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountStanding.Read(Peal.AccountStandingRead value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for unread
    /// </summary>
    [Serializable]
    public struct Unread
    {
        public Unread(Peal.AccountStandingUnread value)
        {
            Value = value;
        }

        internal Peal.AccountStandingUnread Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountStanding.Unread(Peal.AccountStandingUnread value) =>
            new(value);
    }
}
