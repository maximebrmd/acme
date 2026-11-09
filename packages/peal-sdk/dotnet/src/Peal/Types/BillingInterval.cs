using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(BillingInterval.BillingIntervalSerializer))]
[Serializable]
public readonly record struct BillingInterval : IStringEnum
{
    public static readonly BillingInterval Month = new(Values.Month);

    public static readonly BillingInterval Year = new(Values.Year);

    public BillingInterval(string value)
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
    public static BillingInterval FromCustom(string value)
    {
        return new BillingInterval(value);
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

    public static bool operator ==(BillingInterval value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(BillingInterval value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(BillingInterval value) => value.Value;

    public static explicit operator BillingInterval(string value) => new(value);

    internal class BillingIntervalSerializer : JsonConverter<BillingInterval>
    {
        public override BillingInterval Read(
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
            return new BillingInterval(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            BillingInterval value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override BillingInterval ReadAsPropertyName(
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
            return new BillingInterval(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            BillingInterval value,
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
        public const string Month = "month";

        public const string Year = "year";
    }
}
