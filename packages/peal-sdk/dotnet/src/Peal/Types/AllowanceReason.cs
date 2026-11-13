using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AllowanceReason.AllowanceReasonSerializer))]
[Serializable]
public readonly record struct AllowanceReason : IStringEnum
{
    public static readonly AllowanceReason PaymentMethodRequired = new(
        Values.PaymentMethodRequired
    );

    public static readonly AllowanceReason CeilingReached = new(Values.CeilingReached);

    public static readonly AllowanceReason NotEnabled = new(Values.NotEnabled);

    public AllowanceReason(string value)
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
    public static AllowanceReason FromCustom(string value)
    {
        return new AllowanceReason(value);
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

    public static bool operator ==(AllowanceReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AllowanceReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AllowanceReason value) => value.Value;

    public static explicit operator AllowanceReason(string value) => new(value);

    internal class AllowanceReasonSerializer : JsonConverter<AllowanceReason>
    {
        public override AllowanceReason Read(
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
            return new AllowanceReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AllowanceReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AllowanceReason ReadAsPropertyName(
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
            return new AllowanceReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AllowanceReason value,
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
        public const string PaymentMethodRequired = "paymentMethodRequired";

        public const string CeilingReached = "ceilingReached";

        public const string NotEnabled = "notEnabled";
    }
}
