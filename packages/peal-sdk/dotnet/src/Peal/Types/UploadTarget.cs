// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UploadTarget.JsonConverter))]
[Serializable]
public record UploadTarget
{
    internal UploadTarget(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of UploadTarget with <see cref="UploadTarget.Single"/>.
    /// </summary>
    public UploadTarget(UploadTarget.Single value)
    {
        Type = "single";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of UploadTarget with <see cref="UploadTarget.Multipart"/>.
    /// </summary>
    public UploadTarget(UploadTarget.Multipart value)
    {
        Type = "multipart";
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
    /// Returns true if <see cref="Type"/> is "single"
    /// </summary>
    public bool IsSingle => Type == "single";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "multipart"
    /// </summary>
    public bool IsMultipart => Type == "multipart";

    /// <summary>
    /// Returns the value as a <see cref="Peal.UploadTargetSingle"/> if <see cref="Type"/> is 'single', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'single'.</exception>
    public Peal.UploadTargetSingle AsSingle() =>
        IsSingle
            ? (Peal.UploadTargetSingle)Value!
            : throw new global::System.Exception("UploadTarget.Type is not 'single'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.UploadTargetMultipart"/> if <see cref="Type"/> is 'multipart', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'multipart'.</exception>
    public Peal.UploadTargetMultipart AsMultipart() =>
        IsMultipart
            ? (Peal.UploadTargetMultipart)Value!
            : throw new global::System.Exception("UploadTarget.Type is not 'multipart'");

    public T Match<T>(
        Func<Peal.UploadTargetSingle, T> onSingle,
        Func<Peal.UploadTargetMultipart, T> onMultipart,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "single" => onSingle(AsSingle()),
            "multipart" => onMultipart(AsMultipart()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.UploadTargetSingle> onSingle,
        Action<Peal.UploadTargetMultipart> onMultipart,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "single":
                onSingle(AsSingle());
                break;
            case "multipart":
                onMultipart(AsMultipart());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UploadTargetSingle"/> and returns true if successful.
    /// </summary>
    public bool TryAsSingle(out Peal.UploadTargetSingle? value)
    {
        if (Type == "single")
        {
            value = (Peal.UploadTargetSingle)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UploadTargetMultipart"/> and returns true if successful.
    /// </summary>
    public bool TryAsMultipart(out Peal.UploadTargetMultipart? value)
    {
        if (Type == "multipart")
        {
            value = (Peal.UploadTargetMultipart)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator UploadTarget(UploadTarget.Single value) => new(value);

    public static implicit operator UploadTarget(UploadTarget.Multipart value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<UploadTarget>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(UploadTarget).IsAssignableFrom(typeToConvert);

        public override UploadTarget Read(
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
                "single" => jsonWithoutDiscriminator.Deserialize<Peal.UploadTargetSingle?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.UploadTargetSingle"),
                "multipart" => jsonWithoutDiscriminator.Deserialize<Peal.UploadTargetMultipart?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.UploadTargetMultipart"),
                _ => json.Deserialize<object?>(options),
            };
            return new UploadTarget(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UploadTarget value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "single" => JsonSerializer.SerializeToNode(value.Value, options),
                    "multipart" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override UploadTarget ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new UploadTarget(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UploadTarget value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for single
    /// </summary>
    [Serializable]
    public struct Single
    {
        public Single(Peal.UploadTargetSingle value)
        {
            Value = value;
        }

        internal Peal.UploadTargetSingle Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UploadTarget.Single(Peal.UploadTargetSingle value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for multipart
    /// </summary>
    [Serializable]
    public struct Multipart
    {
        public Multipart(Peal.UploadTargetMultipart value)
        {
            Value = value;
        }

        internal Peal.UploadTargetMultipart Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator UploadTarget.Multipart(Peal.UploadTargetMultipart value) =>
            new(value);
    }
}
