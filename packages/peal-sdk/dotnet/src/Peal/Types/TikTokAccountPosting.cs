// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TikTokAccountPosting.JsonConverter))]
[Serializable]
public record TikTokAccountPosting
{
    internal TikTokAccountPosting(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of TikTokAccountPosting with <see cref="TikTokAccountPosting.Ready"/>.
    /// </summary>
    public TikTokAccountPosting(TikTokAccountPosting.Ready value)
    {
        Type = "ready";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of TikTokAccountPosting with <see cref="TikTokAccountPosting.Blocked"/>.
    /// </summary>
    public TikTokAccountPosting(TikTokAccountPosting.Blocked value)
    {
        Type = "blocked";
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
    /// Returns true if <see cref="Type"/> is "ready"
    /// </summary>
    public bool IsReady => Type == "ready";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "blocked"
    /// </summary>
    public bool IsBlocked => Type == "blocked";

    /// <summary>
    /// Returns the value as a <see cref="Peal.TikTokAccountPostingReady"/> if <see cref="Type"/> is 'ready', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ready'.</exception>
    public Peal.TikTokAccountPostingReady AsReady() =>
        IsReady
            ? (Peal.TikTokAccountPostingReady)Value!
            : throw new global::System.Exception("TikTokAccountPosting.Type is not 'ready'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.TikTokAccountPostingBlocked"/> if <see cref="Type"/> is 'blocked', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'blocked'.</exception>
    public Peal.TikTokAccountPostingBlocked AsBlocked() =>
        IsBlocked
            ? (Peal.TikTokAccountPostingBlocked)Value!
            : throw new global::System.Exception("TikTokAccountPosting.Type is not 'blocked'");

    public T Match<T>(
        Func<Peal.TikTokAccountPostingReady, T> onReady,
        Func<Peal.TikTokAccountPostingBlocked, T> onBlocked,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "ready" => onReady(AsReady()),
            "blocked" => onBlocked(AsBlocked()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.TikTokAccountPostingReady> onReady,
        Action<Peal.TikTokAccountPostingBlocked> onBlocked,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "ready":
                onReady(AsReady());
                break;
            case "blocked":
                onBlocked(AsBlocked());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TikTokAccountPostingReady"/> and returns true if successful.
    /// </summary>
    public bool TryAsReady(out Peal.TikTokAccountPostingReady? value)
    {
        if (Type == "ready")
        {
            value = (Peal.TikTokAccountPostingReady)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.TikTokAccountPostingBlocked"/> and returns true if successful.
    /// </summary>
    public bool TryAsBlocked(out Peal.TikTokAccountPostingBlocked? value)
    {
        if (Type == "blocked")
        {
            value = (Peal.TikTokAccountPostingBlocked)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator TikTokAccountPosting(TikTokAccountPosting.Ready value) =>
        new(value);

    public static implicit operator TikTokAccountPosting(TikTokAccountPosting.Blocked value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<TikTokAccountPosting>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(TikTokAccountPosting).IsAssignableFrom(typeToConvert);

        public override TikTokAccountPosting Read(
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
                "ready" => jsonWithoutDiscriminator.Deserialize<Peal.TikTokAccountPostingReady?>(
                    options
                )
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.TikTokAccountPostingReady"
                    ),
                "blocked" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.TikTokAccountPostingBlocked?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.TikTokAccountPostingBlocked"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new TikTokAccountPosting(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TikTokAccountPosting value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "ready" => JsonSerializer.SerializeToNode(value.Value, options),
                    "blocked" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override TikTokAccountPosting ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new TikTokAccountPosting(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TikTokAccountPosting value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for ready
    /// </summary>
    [Serializable]
    public struct Ready
    {
        public Ready(Peal.TikTokAccountPostingReady value)
        {
            Value = value;
        }

        internal Peal.TikTokAccountPostingReady Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TikTokAccountPosting.Ready(
            Peal.TikTokAccountPostingReady value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for blocked
    /// </summary>
    [Serializable]
    public struct Blocked
    {
        public Blocked(Peal.TikTokAccountPostingBlocked value)
        {
            Value = value;
        }

        internal Peal.TikTokAccountPostingBlocked Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator TikTokAccountPosting.Blocked(
            Peal.TikTokAccountPostingBlocked value
        ) => new(value);
    }
}
