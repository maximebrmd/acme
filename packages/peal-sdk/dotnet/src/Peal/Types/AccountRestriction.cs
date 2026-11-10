// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AccountRestriction.JsonConverter))]
[Serializable]
public record AccountRestriction
{
    internal AccountRestriction(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of AccountRestriction with <see cref="AccountRestriction.OptionValues"/>.
    /// </summary>
    public AccountRestriction(AccountRestriction.OptionValues value)
    {
        Type = "optionValues";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AccountRestriction with <see cref="AccountRestriction.OptionFixed"/>.
    /// </summary>
    public AccountRestriction(AccountRestriction.OptionFixed value)
    {
        Type = "optionFixed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AccountRestriction with <see cref="AccountRestriction.VideoDuration"/>.
    /// </summary>
    public AccountRestriction(AccountRestriction.VideoDuration value)
    {
        Type = "videoDuration";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of AccountRestriction with <see cref="AccountRestriction.MediaTypesRefused"/>.
    /// </summary>
    public AccountRestriction(AccountRestriction.MediaTypesRefused value)
    {
        Type = "mediaTypesRefused";
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
    /// Returns true if <see cref="Type"/> is "optionValues"
    /// </summary>
    public bool IsOptionValues => Type == "optionValues";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "optionFixed"
    /// </summary>
    public bool IsOptionFixed => Type == "optionFixed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "videoDuration"
    /// </summary>
    public bool IsVideoDuration => Type == "videoDuration";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "mediaTypesRefused"
    /// </summary>
    public bool IsMediaTypesRefused => Type == "mediaTypesRefused";

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountRestrictionOptionValues"/> if <see cref="Type"/> is 'optionValues', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionValues'.</exception>
    public Peal.AccountRestrictionOptionValues AsOptionValues() =>
        IsOptionValues
            ? (Peal.AccountRestrictionOptionValues)Value!
            : throw new global::System.Exception("AccountRestriction.Type is not 'optionValues'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountRestrictionOptionFixed"/> if <see cref="Type"/> is 'optionFixed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'optionFixed'.</exception>
    public Peal.AccountRestrictionOptionFixed AsOptionFixed() =>
        IsOptionFixed
            ? (Peal.AccountRestrictionOptionFixed)Value!
            : throw new global::System.Exception("AccountRestriction.Type is not 'optionFixed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountRestrictionVideoDuration"/> if <see cref="Type"/> is 'videoDuration', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'videoDuration'.</exception>
    public Peal.AccountRestrictionVideoDuration AsVideoDuration() =>
        IsVideoDuration
            ? (Peal.AccountRestrictionVideoDuration)Value!
            : throw new global::System.Exception("AccountRestriction.Type is not 'videoDuration'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.AccountRestrictionMediaTypesRefused"/> if <see cref="Type"/> is 'mediaTypesRefused', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'mediaTypesRefused'.</exception>
    public Peal.AccountRestrictionMediaTypesRefused AsMediaTypesRefused() =>
        IsMediaTypesRefused
            ? (Peal.AccountRestrictionMediaTypesRefused)Value!
            : throw new global::System.Exception(
                "AccountRestriction.Type is not 'mediaTypesRefused'"
            );

    public T Match<T>(
        Func<Peal.AccountRestrictionOptionValues, T> onOptionValues,
        Func<Peal.AccountRestrictionOptionFixed, T> onOptionFixed,
        Func<Peal.AccountRestrictionVideoDuration, T> onVideoDuration,
        Func<Peal.AccountRestrictionMediaTypesRefused, T> onMediaTypesRefused,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "optionValues" => onOptionValues(AsOptionValues()),
            "optionFixed" => onOptionFixed(AsOptionFixed()),
            "videoDuration" => onVideoDuration(AsVideoDuration()),
            "mediaTypesRefused" => onMediaTypesRefused(AsMediaTypesRefused()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.AccountRestrictionOptionValues> onOptionValues,
        Action<Peal.AccountRestrictionOptionFixed> onOptionFixed,
        Action<Peal.AccountRestrictionVideoDuration> onVideoDuration,
        Action<Peal.AccountRestrictionMediaTypesRefused> onMediaTypesRefused,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "optionValues":
                onOptionValues(AsOptionValues());
                break;
            case "optionFixed":
                onOptionFixed(AsOptionFixed());
                break;
            case "videoDuration":
                onVideoDuration(AsVideoDuration());
                break;
            case "mediaTypesRefused":
                onMediaTypesRefused(AsMediaTypesRefused());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountRestrictionOptionValues"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionValues(out Peal.AccountRestrictionOptionValues? value)
    {
        if (Type == "optionValues")
        {
            value = (Peal.AccountRestrictionOptionValues)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountRestrictionOptionFixed"/> and returns true if successful.
    /// </summary>
    public bool TryAsOptionFixed(out Peal.AccountRestrictionOptionFixed? value)
    {
        if (Type == "optionFixed")
        {
            value = (Peal.AccountRestrictionOptionFixed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountRestrictionVideoDuration"/> and returns true if successful.
    /// </summary>
    public bool TryAsVideoDuration(out Peal.AccountRestrictionVideoDuration? value)
    {
        if (Type == "videoDuration")
        {
            value = (Peal.AccountRestrictionVideoDuration)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.AccountRestrictionMediaTypesRefused"/> and returns true if successful.
    /// </summary>
    public bool TryAsMediaTypesRefused(out Peal.AccountRestrictionMediaTypesRefused? value)
    {
        if (Type == "mediaTypesRefused")
        {
            value = (Peal.AccountRestrictionMediaTypesRefused)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator AccountRestriction(AccountRestriction.OptionValues value) =>
        new(value);

    public static implicit operator AccountRestriction(AccountRestriction.OptionFixed value) =>
        new(value);

    public static implicit operator AccountRestriction(AccountRestriction.VideoDuration value) =>
        new(value);

    public static implicit operator AccountRestriction(
        AccountRestriction.MediaTypesRefused value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<AccountRestriction>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(AccountRestriction).IsAssignableFrom(typeToConvert);

        public override AccountRestriction Read(
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
                "optionValues" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.AccountRestrictionOptionValues?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.AccountRestrictionOptionValues"
                        ),
                "optionFixed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.AccountRestrictionOptionFixed?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.AccountRestrictionOptionFixed"
                        ),
                "videoDuration" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.AccountRestrictionVideoDuration?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.AccountRestrictionVideoDuration"
                        ),
                "mediaTypesRefused" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.AccountRestrictionMediaTypesRefused?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.AccountRestrictionMediaTypesRefused"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new AccountRestriction(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AccountRestriction value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "optionValues" => JsonSerializer.SerializeToNode(value.Value, options),
                    "optionFixed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "videoDuration" => JsonSerializer.SerializeToNode(value.Value, options),
                    "mediaTypesRefused" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override AccountRestriction ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new AccountRestriction(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AccountRestriction value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for optionValues
    /// </summary>
    [Serializable]
    public struct OptionValues
    {
        public OptionValues(Peal.AccountRestrictionOptionValues value)
        {
            Value = value;
        }

        internal Peal.AccountRestrictionOptionValues Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountRestriction.OptionValues(
            Peal.AccountRestrictionOptionValues value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for optionFixed
    /// </summary>
    [Serializable]
    public struct OptionFixed
    {
        public OptionFixed(Peal.AccountRestrictionOptionFixed value)
        {
            Value = value;
        }

        internal Peal.AccountRestrictionOptionFixed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountRestriction.OptionFixed(
            Peal.AccountRestrictionOptionFixed value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for videoDuration
    /// </summary>
    [Serializable]
    public struct VideoDuration
    {
        public VideoDuration(Peal.AccountRestrictionVideoDuration value)
        {
            Value = value;
        }

        internal Peal.AccountRestrictionVideoDuration Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountRestriction.VideoDuration(
            Peal.AccountRestrictionVideoDuration value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for mediaTypesRefused
    /// </summary>
    [Serializable]
    public struct MediaTypesRefused
    {
        public MediaTypesRefused(Peal.AccountRestrictionMediaTypesRefused value)
        {
            Value = value;
        }

        internal Peal.AccountRestrictionMediaTypesRefused Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator AccountRestriction.MediaTypesRefused(
            Peal.AccountRestrictionMediaTypesRefused value
        ) => new(value);
    }
}
