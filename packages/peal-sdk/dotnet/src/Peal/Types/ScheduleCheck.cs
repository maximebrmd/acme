using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ScheduleCheck.ScheduleCheckSerializer))]
[Serializable]
public readonly record struct ScheduleCheck : IStringEnum
{
    public static readonly ScheduleCheck Ok = new(Values.Ok);

    public static readonly ScheduleCheck InPast = new(Values.InPast);

    public static readonly ScheduleCheck InvalidTimeZone = new(Values.InvalidTimeZone);

    public ScheduleCheck(string value)
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
    public static ScheduleCheck FromCustom(string value)
    {
        return new ScheduleCheck(value);
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

    public static bool operator ==(ScheduleCheck value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ScheduleCheck value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ScheduleCheck value) => value.Value;

    public static explicit operator ScheduleCheck(string value) => new(value);

    internal class ScheduleCheckSerializer : JsonConverter<ScheduleCheck>
    {
        public override ScheduleCheck Read(
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
            return new ScheduleCheck(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ScheduleCheck value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ScheduleCheck ReadAsPropertyName(
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
            return new ScheduleCheck(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ScheduleCheck value,
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
        public const string Ok = "ok";

        public const string InPast = "inPast";

        public const string InvalidTimeZone = "invalidTimeZone";
    }
}
