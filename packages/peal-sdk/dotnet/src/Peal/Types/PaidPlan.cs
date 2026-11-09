using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PaidPlan.PaidPlanSerializer))]
[Serializable]
public readonly record struct PaidPlan : IStringEnum
{
    public static readonly PaidPlan Starter = new(Values.Starter);

    public static readonly PaidPlan Pro = new(Values.Pro);

    public static readonly PaidPlan Business = new(Values.Business);

    public static readonly PaidPlan Agency = new(Values.Agency);

    public PaidPlan(string value)
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
    public static PaidPlan FromCustom(string value)
    {
        return new PaidPlan(value);
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

    public static bool operator ==(PaidPlan value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(PaidPlan value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(PaidPlan value) => value.Value;

    public static explicit operator PaidPlan(string value) => new(value);

    internal class PaidPlanSerializer : JsonConverter<PaidPlan>
    {
        public override PaidPlan Read(
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
            return new PaidPlan(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PaidPlan value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PaidPlan ReadAsPropertyName(
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
            return new PaidPlan(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PaidPlan value,
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
        public const string Starter = "starter";

        public const string Pro = "pro";

        public const string Business = "business";

        public const string Agency = "agency";
    }
}
