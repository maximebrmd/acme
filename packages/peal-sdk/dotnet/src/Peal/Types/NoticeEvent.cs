// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NoticeEvent.JsonConverter))]
[Serializable]
public record NoticeEvent
{
    internal NoticeEvent(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostPublished"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostPublished value)
    {
        Type = "PostPublished";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostFailed"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostFailed value)
    {
        Type = "PostFailed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostUnconfirmed"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostUnconfirmed value)
    {
        Type = "PostUnconfirmed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.ChannelReconnectRequired"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.ChannelReconnectRequired value)
    {
        Type = "ChannelReconnectRequired";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.ChannelReconnectSoon"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.ChannelReconnectSoon value)
    {
        Type = "ChannelReconnectSoon";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionStarted"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionStarted value)
    {
        Type = "SubscriptionStarted";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.TrialEnding"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.TrialEnding value)
    {
        Type = "TrialEnding";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionRenewing"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionRenewing value)
    {
        Type = "SubscriptionRenewing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionCancelled"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionCancelled value)
    {
        Type = "SubscriptionCancelled";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionWithdrawn"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionWithdrawn value)
    {
        Type = "SubscriptionWithdrawn";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.WebhookEndpointDisabled"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.WebhookEndpointDisabled value)
    {
        Type = "WebhookEndpointDisabled";
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
    /// Returns true if <see cref="Type"/> is "PostPublished"
    /// </summary>
    public bool IsPostPublished => Type == "PostPublished";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostFailed"
    /// </summary>
    public bool IsPostFailed => Type == "PostFailed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostUnconfirmed"
    /// </summary>
    public bool IsPostUnconfirmed => Type == "PostUnconfirmed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelReconnectRequired"
    /// </summary>
    public bool IsChannelReconnectRequired => Type == "ChannelReconnectRequired";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelReconnectSoon"
    /// </summary>
    public bool IsChannelReconnectSoon => Type == "ChannelReconnectSoon";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionStarted"
    /// </summary>
    public bool IsSubscriptionStarted => Type == "SubscriptionStarted";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TrialEnding"
    /// </summary>
    public bool IsTrialEnding => Type == "TrialEnding";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionRenewing"
    /// </summary>
    public bool IsSubscriptionRenewing => Type == "SubscriptionRenewing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionCancelled"
    /// </summary>
    public bool IsSubscriptionCancelled => Type == "SubscriptionCancelled";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionWithdrawn"
    /// </summary>
    public bool IsSubscriptionWithdrawn => Type == "SubscriptionWithdrawn";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "WebhookEndpointDisabled"
    /// </summary>
    public bool IsWebhookEndpointDisabled => Type == "WebhookEndpointDisabled";

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostPublished"/> if <see cref="Type"/> is 'PostPublished', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostPublished'.</exception>
    public Peal.NoticeEventPostPublished AsPostPublished() =>
        IsPostPublished
            ? (Peal.NoticeEventPostPublished)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostPublished'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostFailed"/> if <see cref="Type"/> is 'PostFailed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostFailed'.</exception>
    public Peal.NoticeEventPostFailed AsPostFailed() =>
        IsPostFailed
            ? (Peal.NoticeEventPostFailed)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostFailed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostUnconfirmed"/> if <see cref="Type"/> is 'PostUnconfirmed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostUnconfirmed'.</exception>
    public Peal.NoticeEventPostUnconfirmed AsPostUnconfirmed() =>
        IsPostUnconfirmed
            ? (Peal.NoticeEventPostUnconfirmed)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostUnconfirmed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventChannelReconnectRequired"/> if <see cref="Type"/> is 'ChannelReconnectRequired', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelReconnectRequired'.</exception>
    public Peal.NoticeEventChannelReconnectRequired AsChannelReconnectRequired() =>
        IsChannelReconnectRequired
            ? (Peal.NoticeEventChannelReconnectRequired)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'ChannelReconnectRequired'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventChannelReconnectSoon"/> if <see cref="Type"/> is 'ChannelReconnectSoon', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelReconnectSoon'.</exception>
    public Peal.NoticeEventChannelReconnectSoon AsChannelReconnectSoon() =>
        IsChannelReconnectSoon
            ? (Peal.NoticeEventChannelReconnectSoon)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'ChannelReconnectSoon'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionStarted"/> if <see cref="Type"/> is 'SubscriptionStarted', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionStarted'.</exception>
    public Peal.NoticeEventSubscriptionStarted AsSubscriptionStarted() =>
        IsSubscriptionStarted
            ? (Peal.NoticeEventSubscriptionStarted)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionStarted'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventTrialEnding"/> if <see cref="Type"/> is 'TrialEnding', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TrialEnding'.</exception>
    public Peal.NoticeEventTrialEnding AsTrialEnding() =>
        IsTrialEnding
            ? (Peal.NoticeEventTrialEnding)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'TrialEnding'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionRenewing"/> if <see cref="Type"/> is 'SubscriptionRenewing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionRenewing'.</exception>
    public Peal.NoticeEventSubscriptionRenewing AsSubscriptionRenewing() =>
        IsSubscriptionRenewing
            ? (Peal.NoticeEventSubscriptionRenewing)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionRenewing'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionCancelled"/> if <see cref="Type"/> is 'SubscriptionCancelled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionCancelled'.</exception>
    public Peal.NoticeEventSubscriptionCancelled AsSubscriptionCancelled() =>
        IsSubscriptionCancelled
            ? (Peal.NoticeEventSubscriptionCancelled)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionCancelled'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionWithdrawn"/> if <see cref="Type"/> is 'SubscriptionWithdrawn', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionWithdrawn'.</exception>
    public Peal.NoticeEventSubscriptionWithdrawn AsSubscriptionWithdrawn() =>
        IsSubscriptionWithdrawn
            ? (Peal.NoticeEventSubscriptionWithdrawn)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionWithdrawn'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventWebhookEndpointDisabled"/> if <see cref="Type"/> is 'WebhookEndpointDisabled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'WebhookEndpointDisabled'.</exception>
    public Peal.NoticeEventWebhookEndpointDisabled AsWebhookEndpointDisabled() =>
        IsWebhookEndpointDisabled
            ? (Peal.NoticeEventWebhookEndpointDisabled)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'WebhookEndpointDisabled'"
            );

    public T Match<T>(
        Func<Peal.NoticeEventPostPublished, T> onPostPublished,
        Func<Peal.NoticeEventPostFailed, T> onPostFailed,
        Func<Peal.NoticeEventPostUnconfirmed, T> onPostUnconfirmed,
        Func<Peal.NoticeEventChannelReconnectRequired, T> onChannelReconnectRequired,
        Func<Peal.NoticeEventChannelReconnectSoon, T> onChannelReconnectSoon,
        Func<Peal.NoticeEventSubscriptionStarted, T> onSubscriptionStarted,
        Func<Peal.NoticeEventTrialEnding, T> onTrialEnding,
        Func<Peal.NoticeEventSubscriptionRenewing, T> onSubscriptionRenewing,
        Func<Peal.NoticeEventSubscriptionCancelled, T> onSubscriptionCancelled,
        Func<Peal.NoticeEventSubscriptionWithdrawn, T> onSubscriptionWithdrawn,
        Func<Peal.NoticeEventWebhookEndpointDisabled, T> onWebhookEndpointDisabled,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "PostPublished" => onPostPublished(AsPostPublished()),
            "PostFailed" => onPostFailed(AsPostFailed()),
            "PostUnconfirmed" => onPostUnconfirmed(AsPostUnconfirmed()),
            "ChannelReconnectRequired" => onChannelReconnectRequired(AsChannelReconnectRequired()),
            "ChannelReconnectSoon" => onChannelReconnectSoon(AsChannelReconnectSoon()),
            "SubscriptionStarted" => onSubscriptionStarted(AsSubscriptionStarted()),
            "TrialEnding" => onTrialEnding(AsTrialEnding()),
            "SubscriptionRenewing" => onSubscriptionRenewing(AsSubscriptionRenewing()),
            "SubscriptionCancelled" => onSubscriptionCancelled(AsSubscriptionCancelled()),
            "SubscriptionWithdrawn" => onSubscriptionWithdrawn(AsSubscriptionWithdrawn()),
            "WebhookEndpointDisabled" => onWebhookEndpointDisabled(AsWebhookEndpointDisabled()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.NoticeEventPostPublished> onPostPublished,
        Action<Peal.NoticeEventPostFailed> onPostFailed,
        Action<Peal.NoticeEventPostUnconfirmed> onPostUnconfirmed,
        Action<Peal.NoticeEventChannelReconnectRequired> onChannelReconnectRequired,
        Action<Peal.NoticeEventChannelReconnectSoon> onChannelReconnectSoon,
        Action<Peal.NoticeEventSubscriptionStarted> onSubscriptionStarted,
        Action<Peal.NoticeEventTrialEnding> onTrialEnding,
        Action<Peal.NoticeEventSubscriptionRenewing> onSubscriptionRenewing,
        Action<Peal.NoticeEventSubscriptionCancelled> onSubscriptionCancelled,
        Action<Peal.NoticeEventSubscriptionWithdrawn> onSubscriptionWithdrawn,
        Action<Peal.NoticeEventWebhookEndpointDisabled> onWebhookEndpointDisabled,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "PostPublished":
                onPostPublished(AsPostPublished());
                break;
            case "PostFailed":
                onPostFailed(AsPostFailed());
                break;
            case "PostUnconfirmed":
                onPostUnconfirmed(AsPostUnconfirmed());
                break;
            case "ChannelReconnectRequired":
                onChannelReconnectRequired(AsChannelReconnectRequired());
                break;
            case "ChannelReconnectSoon":
                onChannelReconnectSoon(AsChannelReconnectSoon());
                break;
            case "SubscriptionStarted":
                onSubscriptionStarted(AsSubscriptionStarted());
                break;
            case "TrialEnding":
                onTrialEnding(AsTrialEnding());
                break;
            case "SubscriptionRenewing":
                onSubscriptionRenewing(AsSubscriptionRenewing());
                break;
            case "SubscriptionCancelled":
                onSubscriptionCancelled(AsSubscriptionCancelled());
                break;
            case "SubscriptionWithdrawn":
                onSubscriptionWithdrawn(AsSubscriptionWithdrawn());
                break;
            case "WebhookEndpointDisabled":
                onWebhookEndpointDisabled(AsWebhookEndpointDisabled());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostPublished"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostPublished(out Peal.NoticeEventPostPublished? value)
    {
        if (Type == "PostPublished")
        {
            value = (Peal.NoticeEventPostPublished)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostFailed"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostFailed(out Peal.NoticeEventPostFailed? value)
    {
        if (Type == "PostFailed")
        {
            value = (Peal.NoticeEventPostFailed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostUnconfirmed"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostUnconfirmed(out Peal.NoticeEventPostUnconfirmed? value)
    {
        if (Type == "PostUnconfirmed")
        {
            value = (Peal.NoticeEventPostUnconfirmed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventChannelReconnectRequired"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelReconnectRequired(out Peal.NoticeEventChannelReconnectRequired? value)
    {
        if (Type == "ChannelReconnectRequired")
        {
            value = (Peal.NoticeEventChannelReconnectRequired)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventChannelReconnectSoon"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelReconnectSoon(out Peal.NoticeEventChannelReconnectSoon? value)
    {
        if (Type == "ChannelReconnectSoon")
        {
            value = (Peal.NoticeEventChannelReconnectSoon)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionStarted"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionStarted(out Peal.NoticeEventSubscriptionStarted? value)
    {
        if (Type == "SubscriptionStarted")
        {
            value = (Peal.NoticeEventSubscriptionStarted)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventTrialEnding"/> and returns true if successful.
    /// </summary>
    public bool TryAsTrialEnding(out Peal.NoticeEventTrialEnding? value)
    {
        if (Type == "TrialEnding")
        {
            value = (Peal.NoticeEventTrialEnding)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionRenewing"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionRenewing(out Peal.NoticeEventSubscriptionRenewing? value)
    {
        if (Type == "SubscriptionRenewing")
        {
            value = (Peal.NoticeEventSubscriptionRenewing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionCancelled"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionCancelled(out Peal.NoticeEventSubscriptionCancelled? value)
    {
        if (Type == "SubscriptionCancelled")
        {
            value = (Peal.NoticeEventSubscriptionCancelled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionWithdrawn"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionWithdrawn(out Peal.NoticeEventSubscriptionWithdrawn? value)
    {
        if (Type == "SubscriptionWithdrawn")
        {
            value = (Peal.NoticeEventSubscriptionWithdrawn)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventWebhookEndpointDisabled"/> and returns true if successful.
    /// </summary>
    public bool TryAsWebhookEndpointDisabled(out Peal.NoticeEventWebhookEndpointDisabled? value)
    {
        if (Type == "WebhookEndpointDisabled")
        {
            value = (Peal.NoticeEventWebhookEndpointDisabled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator NoticeEvent(NoticeEvent.PostPublished value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostFailed value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostUnconfirmed value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.ChannelReconnectRequired value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.ChannelReconnectSoon value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionStarted value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.TrialEnding value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionRenewing value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionCancelled value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionWithdrawn value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.WebhookEndpointDisabled value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<NoticeEvent>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(NoticeEvent).IsAssignableFrom(typeToConvert);

        public override NoticeEvent Read(
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
                "PostPublished" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostPublished?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostPublished"
                        ),
                "PostFailed" => jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostFailed?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.NoticeEventPostFailed"),
                "PostUnconfirmed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostUnconfirmed?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostUnconfirmed"
                        ),
                "ChannelReconnectRequired" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventChannelReconnectRequired?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventChannelReconnectRequired"
                        ),
                "ChannelReconnectSoon" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventChannelReconnectSoon?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventChannelReconnectSoon"
                        ),
                "SubscriptionStarted" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionStarted?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionStarted"
                        ),
                "TrialEnding" => jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventTrialEnding?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.NoticeEventTrialEnding"),
                "SubscriptionRenewing" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionRenewing?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionRenewing"
                        ),
                "SubscriptionCancelled" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionCancelled?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionCancelled"
                        ),
                "SubscriptionWithdrawn" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionWithdrawn?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionWithdrawn"
                        ),
                "WebhookEndpointDisabled" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventWebhookEndpointDisabled?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventWebhookEndpointDisabled"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new NoticeEvent(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NoticeEvent value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "PostPublished" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostFailed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostUnconfirmed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ChannelReconnectRequired" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "ChannelReconnectSoon" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionStarted" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TrialEnding" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionRenewing" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionCancelled" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionWithdrawn" => JsonSerializer.SerializeToNode(value.Value, options),
                    "WebhookEndpointDisabled" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override NoticeEvent ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new NoticeEvent(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NoticeEvent value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for PostPublished
    /// </summary>
    [Serializable]
    public struct PostPublished
    {
        public PostPublished(Peal.NoticeEventPostPublished value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostPublished Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostPublished(
            Peal.NoticeEventPostPublished value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostFailed
    /// </summary>
    [Serializable]
    public struct PostFailed
    {
        public PostFailed(Peal.NoticeEventPostFailed value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostFailed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostFailed(Peal.NoticeEventPostFailed value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for PostUnconfirmed
    /// </summary>
    [Serializable]
    public struct PostUnconfirmed
    {
        public PostUnconfirmed(Peal.NoticeEventPostUnconfirmed value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostUnconfirmed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostUnconfirmed(
            Peal.NoticeEventPostUnconfirmed value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelReconnectRequired
    /// </summary>
    [Serializable]
    public struct ChannelReconnectRequired
    {
        public ChannelReconnectRequired(Peal.NoticeEventChannelReconnectRequired value)
        {
            Value = value;
        }

        internal Peal.NoticeEventChannelReconnectRequired Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.ChannelReconnectRequired(
            Peal.NoticeEventChannelReconnectRequired value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelReconnectSoon
    /// </summary>
    [Serializable]
    public struct ChannelReconnectSoon
    {
        public ChannelReconnectSoon(Peal.NoticeEventChannelReconnectSoon value)
        {
            Value = value;
        }

        internal Peal.NoticeEventChannelReconnectSoon Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.ChannelReconnectSoon(
            Peal.NoticeEventChannelReconnectSoon value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionStarted
    /// </summary>
    [Serializable]
    public struct SubscriptionStarted
    {
        public SubscriptionStarted(Peal.NoticeEventSubscriptionStarted value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionStarted Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionStarted(
            Peal.NoticeEventSubscriptionStarted value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TrialEnding
    /// </summary>
    [Serializable]
    public struct TrialEnding
    {
        public TrialEnding(Peal.NoticeEventTrialEnding value)
        {
            Value = value;
        }

        internal Peal.NoticeEventTrialEnding Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.TrialEnding(
            Peal.NoticeEventTrialEnding value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionRenewing
    /// </summary>
    [Serializable]
    public struct SubscriptionRenewing
    {
        public SubscriptionRenewing(Peal.NoticeEventSubscriptionRenewing value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionRenewing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionRenewing(
            Peal.NoticeEventSubscriptionRenewing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionCancelled
    /// </summary>
    [Serializable]
    public struct SubscriptionCancelled
    {
        public SubscriptionCancelled(Peal.NoticeEventSubscriptionCancelled value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionCancelled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionCancelled(
            Peal.NoticeEventSubscriptionCancelled value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionWithdrawn
    /// </summary>
    [Serializable]
    public struct SubscriptionWithdrawn
    {
        public SubscriptionWithdrawn(Peal.NoticeEventSubscriptionWithdrawn value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionWithdrawn Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionWithdrawn(
            Peal.NoticeEventSubscriptionWithdrawn value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for WebhookEndpointDisabled
    /// </summary>
    [Serializable]
    public struct WebhookEndpointDisabled
    {
        public WebhookEndpointDisabled(Peal.NoticeEventWebhookEndpointDisabled value)
        {
            Value = value;
        }

        internal Peal.NoticeEventWebhookEndpointDisabled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.WebhookEndpointDisabled(
            Peal.NoticeEventWebhookEndpointDisabled value
        ) => new(value);
    }
}
