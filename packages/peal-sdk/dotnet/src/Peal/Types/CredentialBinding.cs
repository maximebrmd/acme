// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CredentialBinding.JsonConverter))]
[Serializable]
public record CredentialBinding
{
    internal CredentialBinding(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of CredentialBinding with <see cref="CredentialBinding.Unbound"/>.
    /// </summary>
    public CredentialBinding(CredentialBinding.Unbound value)
    {
        Type = "unbound";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of CredentialBinding with <see cref="CredentialBinding.Bound"/>.
    /// </summary>
    public CredentialBinding(CredentialBinding.Bound value)
    {
        Type = "bound";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of CredentialBinding with <see cref="CredentialBinding.Left"/>.
    /// </summary>
    public CredentialBinding(CredentialBinding.Left value)
    {
        Type = "left";
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
    /// Returns true if <see cref="Type"/> is "unbound"
    /// </summary>
    public bool IsUnbound => Type == "unbound";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "bound"
    /// </summary>
    public bool IsBound => Type == "bound";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "left"
    /// </summary>
    public bool IsLeft => Type == "left";

    /// <summary>
    /// Returns the value as a <see cref="Peal.CredentialBindingUnbound"/> if <see cref="Type"/> is 'unbound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'unbound'.</exception>
    public Peal.CredentialBindingUnbound AsUnbound() =>
        IsUnbound
            ? (Peal.CredentialBindingUnbound)Value!
            : throw new global::System.Exception("CredentialBinding.Type is not 'unbound'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.CredentialBindingBound"/> if <see cref="Type"/> is 'bound', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'bound'.</exception>
    public Peal.CredentialBindingBound AsBound() =>
        IsBound
            ? (Peal.CredentialBindingBound)Value!
            : throw new global::System.Exception("CredentialBinding.Type is not 'bound'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.CredentialBindingLeft"/> if <see cref="Type"/> is 'left', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'left'.</exception>
    public Peal.CredentialBindingLeft AsLeft() =>
        IsLeft
            ? (Peal.CredentialBindingLeft)Value!
            : throw new global::System.Exception("CredentialBinding.Type is not 'left'");

    public T Match<T>(
        Func<Peal.CredentialBindingUnbound, T> onUnbound,
        Func<Peal.CredentialBindingBound, T> onBound,
        Func<Peal.CredentialBindingLeft, T> onLeft,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "unbound" => onUnbound(AsUnbound()),
            "bound" => onBound(AsBound()),
            "left" => onLeft(AsLeft()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.CredentialBindingUnbound> onUnbound,
        Action<Peal.CredentialBindingBound> onBound,
        Action<Peal.CredentialBindingLeft> onLeft,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "unbound":
                onUnbound(AsUnbound());
                break;
            case "bound":
                onBound(AsBound());
                break;
            case "left":
                onLeft(AsLeft());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.CredentialBindingUnbound"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnbound(out Peal.CredentialBindingUnbound? value)
    {
        if (Type == "unbound")
        {
            value = (Peal.CredentialBindingUnbound)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.CredentialBindingBound"/> and returns true if successful.
    /// </summary>
    public bool TryAsBound(out Peal.CredentialBindingBound? value)
    {
        if (Type == "bound")
        {
            value = (Peal.CredentialBindingBound)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.CredentialBindingLeft"/> and returns true if successful.
    /// </summary>
    public bool TryAsLeft(out Peal.CredentialBindingLeft? value)
    {
        if (Type == "left")
        {
            value = (Peal.CredentialBindingLeft)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator CredentialBinding(CredentialBinding.Unbound value) =>
        new(value);

    public static implicit operator CredentialBinding(CredentialBinding.Bound value) => new(value);

    public static implicit operator CredentialBinding(CredentialBinding.Left value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<CredentialBinding>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(CredentialBinding).IsAssignableFrom(typeToConvert);

        public override CredentialBinding Read(
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
                "unbound" => jsonWithoutDiscriminator.Deserialize<Peal.CredentialBindingUnbound?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.CredentialBindingUnbound"),
                "bound" => jsonWithoutDiscriminator.Deserialize<Peal.CredentialBindingBound?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.CredentialBindingBound"),
                "left" => jsonWithoutDiscriminator.Deserialize<Peal.CredentialBindingLeft?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.CredentialBindingLeft"),
                _ => json.Deserialize<object?>(options),
            };
            return new CredentialBinding(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CredentialBinding value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "unbound" => JsonSerializer.SerializeToNode(value.Value, options),
                    "bound" => JsonSerializer.SerializeToNode(value.Value, options),
                    "left" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override CredentialBinding ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new CredentialBinding(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CredentialBinding value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for unbound
    /// </summary>
    [Serializable]
    public struct Unbound
    {
        public Unbound(Peal.CredentialBindingUnbound value)
        {
            Value = value;
        }

        internal Peal.CredentialBindingUnbound Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator CredentialBinding.Unbound(
            Peal.CredentialBindingUnbound value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for bound
    /// </summary>
    [Serializable]
    public struct Bound
    {
        public Bound(Peal.CredentialBindingBound value)
        {
            Value = value;
        }

        internal Peal.CredentialBindingBound Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator CredentialBinding.Bound(
            Peal.CredentialBindingBound value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for left
    /// </summary>
    [Serializable]
    public struct Left
    {
        public Left(Peal.CredentialBindingLeft value)
        {
            Value = value;
        }

        internal Peal.CredentialBindingLeft Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator CredentialBinding.Left(Peal.CredentialBindingLeft value) =>
            new(value);
    }
}
