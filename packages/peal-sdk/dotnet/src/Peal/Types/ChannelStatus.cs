// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelStatus.JsonConverter))]
[Serializable]
public record ChannelStatus
{
    internal ChannelStatus(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ChannelStatus with <see cref="ChannelStatus.Active"/>.
    /// </summary>
    public ChannelStatus(ChannelStatus.Active value)
    {
        Type = "active";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ChannelStatus with <see cref="ChannelStatus.RefreshNeeded"/>.
    /// </summary>
    public ChannelStatus(ChannelStatus.RefreshNeeded value)
    {
        Type = "refreshNeeded";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ChannelStatus with <see cref="ChannelStatus.Disabled"/>.
    /// </summary>
    public ChannelStatus(ChannelStatus.Disabled value)
    {
        Type = "disabled";
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
    /// Returns true if <see cref="Type"/> is "active"
    /// </summary>
    public bool IsActive => Type == "active";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "refreshNeeded"
    /// </summary>
    public bool IsRefreshNeeded => Type == "refreshNeeded";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "disabled"
    /// </summary>
    public bool IsDisabled => Type == "disabled";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ChannelStatusActive"/> if <see cref="Type"/> is 'active', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'active'.</exception>
    public Peal.ChannelStatusActive AsActive() =>
        IsActive
            ? (Peal.ChannelStatusActive)Value!
            : throw new global::System.Exception("ChannelStatus.Type is not 'active'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ChannelStatusRefreshNeeded"/> if <see cref="Type"/> is 'refreshNeeded', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'refreshNeeded'.</exception>
    public Peal.ChannelStatusRefreshNeeded AsRefreshNeeded() =>
        IsRefreshNeeded
            ? (Peal.ChannelStatusRefreshNeeded)Value!
            : throw new global::System.Exception("ChannelStatus.Type is not 'refreshNeeded'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ChannelStatusDisabled"/> if <see cref="Type"/> is 'disabled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'disabled'.</exception>
    public Peal.ChannelStatusDisabled AsDisabled() =>
        IsDisabled
            ? (Peal.ChannelStatusDisabled)Value!
            : throw new global::System.Exception("ChannelStatus.Type is not 'disabled'");

    public T Match<T>(
        Func<Peal.ChannelStatusActive, T> onActive,
        Func<Peal.ChannelStatusRefreshNeeded, T> onRefreshNeeded,
        Func<Peal.ChannelStatusDisabled, T> onDisabled,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "active" => onActive(AsActive()),
            "refreshNeeded" => onRefreshNeeded(AsRefreshNeeded()),
            "disabled" => onDisabled(AsDisabled()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ChannelStatusActive> onActive,
        Action<Peal.ChannelStatusRefreshNeeded> onRefreshNeeded,
        Action<Peal.ChannelStatusDisabled> onDisabled,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "active":
                onActive(AsActive());
                break;
            case "refreshNeeded":
                onRefreshNeeded(AsRefreshNeeded());
                break;
            case "disabled":
                onDisabled(AsDisabled());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ChannelStatusActive"/> and returns true if successful.
    /// </summary>
    public bool TryAsActive(out Peal.ChannelStatusActive? value)
    {
        if (Type == "active")
        {
            value = (Peal.ChannelStatusActive)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ChannelStatusRefreshNeeded"/> and returns true if successful.
    /// </summary>
    public bool TryAsRefreshNeeded(out Peal.ChannelStatusRefreshNeeded? value)
    {
        if (Type == "refreshNeeded")
        {
            value = (Peal.ChannelStatusRefreshNeeded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ChannelStatusDisabled"/> and returns true if successful.
    /// </summary>
    public bool TryAsDisabled(out Peal.ChannelStatusDisabled? value)
    {
        if (Type == "disabled")
        {
            value = (Peal.ChannelStatusDisabled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ChannelStatus(ChannelStatus.Active value) => new(value);

    public static implicit operator ChannelStatus(ChannelStatus.RefreshNeeded value) => new(value);

    public static implicit operator ChannelStatus(ChannelStatus.Disabled value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ChannelStatus>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ChannelStatus).IsAssignableFrom(typeToConvert);

        public override ChannelStatus Read(
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
                "active" => jsonWithoutDiscriminator.Deserialize<Peal.ChannelStatusActive?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ChannelStatusActive"),
                "refreshNeeded" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ChannelStatusRefreshNeeded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ChannelStatusRefreshNeeded"
                        ),
                "disabled" => jsonWithoutDiscriminator.Deserialize<Peal.ChannelStatusDisabled?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ChannelStatusDisabled"),
                _ => json.Deserialize<object?>(options),
            };
            return new ChannelStatus(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelStatus value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "active" => JsonSerializer.SerializeToNode(value.Value, options),
                    "refreshNeeded" => JsonSerializer.SerializeToNode(value.Value, options),
                    "disabled" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ChannelStatus ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ChannelStatus(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for active
    /// </summary>
    [Serializable]
    public struct Active
    {
        public Active(Peal.ChannelStatusActive value)
        {
            Value = value;
        }

        internal Peal.ChannelStatusActive Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ChannelStatus.Active(Peal.ChannelStatusActive value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for refreshNeeded
    /// </summary>
    [Serializable]
    public struct RefreshNeeded
    {
        public RefreshNeeded(Peal.ChannelStatusRefreshNeeded value)
        {
            Value = value;
        }

        internal Peal.ChannelStatusRefreshNeeded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ChannelStatus.RefreshNeeded(
            Peal.ChannelStatusRefreshNeeded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for disabled
    /// </summary>
    [Serializable]
    public struct Disabled
    {
        public Disabled(Peal.ChannelStatusDisabled value)
        {
            Value = value;
        }

        internal Peal.ChannelStatusDisabled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ChannelStatus.Disabled(Peal.ChannelStatusDisabled value) =>
            new(value);
    }
}
