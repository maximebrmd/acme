using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantOffReason.AssistantOffReasonSerializer))]
[Serializable]
public readonly record struct AssistantOffReason : IStringEnum
{
    public static readonly AssistantOffReason PaymentMethod = new(Values.PaymentMethod);

    public AssistantOffReason(string value)
    {
        Value = value;
    }

    /// <summary>
    /// The string value of the enum.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a string enum with the given value.
    /// </summary>
    public static AssistantOffReason FromCustom(string value)
    {
        return new AssistantOffReason(value);
    }

    public bool Equals(string? other)
    {
        return Value.Equals(other);
    }

    /// <summary>
    /// Returns the string value of the enum.
    /// </summary>
    public override string ToString()
    {
        return Value;
    }

    public static bool operator ==(AssistantOffReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantOffReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantOffReason value) => value.Value;

    public static explicit operator AssistantOffReason(string value) => new(value);

    internal class AssistantOffReasonSerializer : JsonConverter<AssistantOffReason>
    {
        public override AssistantOffReason Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON value could not be read as a string."
                );
            return new AssistantOffReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantOffReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantOffReason ReadAsPropertyName(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON property name could not be read as a string."
                );
            return new AssistantOffReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantOffReason value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Value);
        }
    }

    /// <summary>
    /// Constant strings for enum values
    /// </summary>
    [Serializable]
    public static class Values
    {
        public const string PaymentMethod = "paymentMethod";
    }
}
