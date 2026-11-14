// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PaymentRequiredErrorBody.JsonConverter))]
[Serializable]
public record PaymentRequiredErrorBody
{
    internal PaymentRequiredErrorBody(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of PaymentRequiredErrorBody with <see cref="PaymentRequiredErrorBody.UsageAllowanceReached"/>.
    /// </summary>
    public PaymentRequiredErrorBody(PaymentRequiredErrorBody.UsageAllowanceReached value)
    {
        Type = "UsageAllowanceReached";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of PaymentRequiredErrorBody with <see cref="PaymentRequiredErrorBody.PlanLimitReached"/>.
    /// </summary>
    public PaymentRequiredErrorBody(PaymentRequiredErrorBody.PlanLimitReached value)
    {
        Type = "PlanLimitReached";
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
    /// Returns true if <see cref="Type"/> is "UsageAllowanceReached"
    /// </summary>
    public bool IsUsageAllowanceReached => Type == "UsageAllowanceReached";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PlanLimitReached"
    /// </summary>
    public bool IsPlanLimitReached => Type == "PlanLimitReached";

    /// <summary>
    /// Returns the value as a <see cref="Peal.UsageAllowanceReachedEncoded"/> if <see cref="Type"/> is 'UsageAllowanceReached', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'UsageAllowanceReached'.</exception>
    public Peal.UsageAllowanceReachedEncoded AsUsageAllowanceReached() =>
        IsUsageAllowanceReached
            ? (Peal.UsageAllowanceReachedEncoded)Value!
            : throw new global::System.Exception(
                "PaymentRequiredErrorBody.Type is not 'UsageAllowanceReached'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.PlanLimitReachedEncoded"/> if <see cref="Type"/> is 'PlanLimitReached', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PlanLimitReached'.</exception>
    public Peal.PlanLimitReachedEncoded AsPlanLimitReached() =>
        IsPlanLimitReached
            ? (Peal.PlanLimitReachedEncoded)Value!
            : throw new global::System.Exception(
                "PaymentRequiredErrorBody.Type is not 'PlanLimitReached'"
            );

    public T Match<T>(
        Func<Peal.UsageAllowanceReachedEncoded, T> onUsageAllowanceReached,
        Func<Peal.PlanLimitReachedEncoded, T> onPlanLimitReached,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "UsageAllowanceReached" => onUsageAllowanceReached(AsUsageAllowanceReached()),
            "PlanLimitReached" => onPlanLimitReached(AsPlanLimitReached()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.UsageAllowanceReachedEncoded> onUsageAllowanceReached,
        Action<Peal.PlanLimitReachedEncoded> onPlanLimitReached,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "UsageAllowanceReached":
                onUsageAllowanceReached(AsUsageAllowanceReached());
                break;
            case "PlanLimitReached":
                onPlanLimitReached(AsPlanLimitReached());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.UsageAllowanceReachedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsUsageAllowanceReached(out Peal.UsageAllowanceReachedEncoded? value)
    {
        if (Type == "UsageAllowanceReached")
        {
            value = (Peal.UsageAllowanceReachedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.PlanLimitReachedEncoded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPlanLimitReached(out Peal.PlanLimitReachedEncoded? value)
    {
        if (Type == "PlanLimitReached")
        {
            value = (Peal.PlanLimitReachedEncoded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator PaymentRequiredErrorBody(
        PaymentRequiredErrorBody.UsageAllowanceReached value
    ) => new(value);

    public static implicit operator PaymentRequiredErrorBody(
        PaymentRequiredErrorBody.PlanLimitReached value
    ) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<PaymentRequiredErrorBody>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(PaymentRequiredErrorBody).IsAssignableFrom(typeToConvert);

        public override PaymentRequiredErrorBody Read(
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

            var value = discriminator switch
            {
                "UsageAllowanceReached" => json.Deserialize<Peal.UsageAllowanceReachedEncoded?>(
                    options
                )
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.UsageAllowanceReachedEncoded"
                    ),
                "PlanLimitReached" => json.Deserialize<Peal.PlanLimitReachedEncoded?>(options)
                    ?? throw new JsonException(
                        "Failed to deserialize Peal.PlanLimitReachedEncoded"
                    ),
                _ => json.Deserialize<object?>(options),
            };
            return new PaymentRequiredErrorBody(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PaymentRequiredErrorBody value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "UsageAllowanceReached" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PlanLimitReached" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override PaymentRequiredErrorBody ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new PaymentRequiredErrorBody(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PaymentRequiredErrorBody value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for UsageAllowanceReached
    /// </summary>
    [Serializable]
    public struct UsageAllowanceReached
    {
        public UsageAllowanceReached(Peal.UsageAllowanceReachedEncoded value)
        {
            Value = value;
        }

        internal Peal.UsageAllowanceReachedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PaymentRequiredErrorBody.UsageAllowanceReached(
            Peal.UsageAllowanceReachedEncoded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PlanLimitReached
    /// </summary>
    [Serializable]
    public struct PlanLimitReached
    {
        public PlanLimitReached(Peal.PlanLimitReachedEncoded value)
        {
            Value = value;
        }

        internal Peal.PlanLimitReachedEncoded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator PaymentRequiredErrorBody.PlanLimitReached(
            Peal.PlanLimitReachedEncoded value
        ) => new(value);
    }
}
