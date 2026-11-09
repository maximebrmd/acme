// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(MediaStatus.JsonConverter))]
[Serializable]
public record MediaStatus
{
    internal MediaStatus(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of MediaStatus with <see cref="MediaStatus.Pending"/>.
    /// </summary>
    public MediaStatus(MediaStatus.Pending value)
    {
        Type = "pending";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of MediaStatus with <see cref="MediaStatus.Uploaded"/>.
    /// </summary>
    public MediaStatus(MediaStatus.Uploaded value)
    {
        Type = "uploaded";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of MediaStatus with <see cref="MediaStatus.Ready"/>.
    /// </summary>
    public MediaStatus(MediaStatus.Ready value)
    {
        Type = "ready";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of MediaStatus with <see cref="MediaStatus.Rejected"/>.
    /// </summary>
    public MediaStatus(MediaStatus.Rejected value)
    {
        Type = "rejected";
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
    /// Returns true if <see cref="Type"/> is "pending"
    /// </summary>
    public bool IsPending => Type == "pending";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "uploaded"
    /// </summary>
    public bool IsUploaded => Type == "uploaded";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ready"
    /// </summary>
    public bool IsReady => Type == "ready";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "rejected"
    /// </summary>
    public bool IsRejected => Type == "rejected";

    /// <summary>
    /// Returns the value as a <see cref="Peal.MediaStatusPending"/> if <see cref="Type"/> is 'pending', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'pending'.</exception>
    public Peal.MediaStatusPending AsPending() =>
        IsPending
            ? (Peal.MediaStatusPending)Value!
            : throw new global::System.Exception("MediaStatus.Type is not 'pending'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.MediaStatusUploaded"/> if <see cref="Type"/> is 'uploaded', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'uploaded'.</exception>
    public Peal.MediaStatusUploaded AsUploaded() =>
        IsUploaded
            ? (Peal.MediaStatusUploaded)Value!
            : throw new global::System.Exception("MediaStatus.Type is not 'uploaded'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.MediaStatusReady"/> if <see cref="Type"/> is 'ready', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ready'.</exception>
    public Peal.MediaStatusReady AsReady() =>
        IsReady
            ? (Peal.MediaStatusReady)Value!
            : throw new global::System.Exception("MediaStatus.Type is not 'ready'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.MediaStatusRejected"/> if <see cref="Type"/> is 'rejected', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'rejected'.</exception>
    public Peal.MediaStatusRejected AsRejected() =>
        IsRejected
            ? (Peal.MediaStatusRejected)Value!
            : throw new global::System.Exception("MediaStatus.Type is not 'rejected'");

    public T Match<T>(
        Func<Peal.MediaStatusPending, T> onPending,
        Func<Peal.MediaStatusUploaded, T> onUploaded,
        Func<Peal.MediaStatusReady, T> onReady,
        Func<Peal.MediaStatusRejected, T> onRejected,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "pending" => onPending(AsPending()),
            "uploaded" => onUploaded(AsUploaded()),
            "ready" => onReady(AsReady()),
            "rejected" => onRejected(AsRejected()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.MediaStatusPending> onPending,
        Action<Peal.MediaStatusUploaded> onUploaded,
        Action<Peal.MediaStatusReady> onReady,
        Action<Peal.MediaStatusRejected> onRejected,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "pending":
                onPending(AsPending());
                break;
            case "uploaded":
                onUploaded(AsUploaded());
                break;
            case "ready":
                onReady(AsReady());
                break;
            case "rejected":
                onRejected(AsRejected());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MediaStatusPending"/> and returns true if successful.
    /// </summary>
    public bool TryAsPending(out Peal.MediaStatusPending? value)
    {
        if (Type == "pending")
        {
            value = (Peal.MediaStatusPending)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MediaStatusUploaded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUploaded(out Peal.MediaStatusUploaded? value)
    {
        if (Type == "uploaded")
        {
            value = (Peal.MediaStatusUploaded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MediaStatusReady"/> and returns true if successful.
    /// </summary>
    public bool TryAsReady(out Peal.MediaStatusReady? value)
    {
        if (Type == "ready")
        {
            value = (Peal.MediaStatusReady)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.MediaStatusRejected"/> and returns true if successful.
    /// </summary>
    public bool TryAsRejected(out Peal.MediaStatusRejected? value)
    {
        if (Type == "rejected")
        {
            value = (Peal.MediaStatusRejected)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator MediaStatus(MediaStatus.Pending value) => new(value);

    public static implicit operator MediaStatus(MediaStatus.Uploaded value) => new(value);

    public static implicit operator MediaStatus(MediaStatus.Ready value) => new(value);

    public static implicit operator MediaStatus(MediaStatus.Rejected value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<MediaStatus>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(MediaStatus).IsAssignableFrom(typeToConvert);

        public override MediaStatus Read(
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
                "pending" => jsonWithoutDiscriminator.Deserialize<Peal.MediaStatusPending?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.MediaStatusPending"),
                "uploaded" => jsonWithoutDiscriminator.Deserialize<Peal.MediaStatusUploaded?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.MediaStatusUploaded"),
                "ready" => jsonWithoutDiscriminator.Deserialize<Peal.MediaStatusReady?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.MediaStatusReady"),
                "rejected" => jsonWithoutDiscriminator.Deserialize<Peal.MediaStatusRejected?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.MediaStatusRejected"),
                _ => json.Deserialize<object?>(options),
            };
            return new MediaStatus(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            MediaStatus value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "pending" => JsonSerializer.SerializeToNode(value.Value, options),
                    "uploaded" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ready" => JsonSerializer.SerializeToNode(value.Value, options),
                    "rejected" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override MediaStatus ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new MediaStatus(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            MediaStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for pending
    /// </summary>
    [Serializable]
    public struct Pending
    {
        public Pending(Peal.MediaStatusPending value)
        {
            Value = value;
        }

        internal Peal.MediaStatusPending Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator MediaStatus.Pending(Peal.MediaStatusPending value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for uploaded
    /// </summary>
    [Serializable]
    public struct Uploaded
    {
        public Uploaded(Peal.MediaStatusUploaded value)
        {
            Value = value;
        }

        internal Peal.MediaStatusUploaded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator MediaStatus.Uploaded(Peal.MediaStatusUploaded value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for ready
    /// </summary>
    [Serializable]
    public struct Ready
    {
        public Ready(Peal.MediaStatusReady value)
        {
            Value = value;
        }

        internal Peal.MediaStatusReady Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator MediaStatus.Ready(Peal.MediaStatusReady value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for rejected
    /// </summary>
    [Serializable]
    public struct Rejected
    {
        public Rejected(Peal.MediaStatusRejected value)
        {
            Value = value;
        }

        internal Peal.MediaStatusRejected Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator MediaStatus.Rejected(Peal.MediaStatusRejected value) =>
            new(value);
    }
}
