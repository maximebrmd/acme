using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Weekday.WeekdaySerializer))]
[Serializable]
public readonly record struct Weekday : IStringEnum
{
    public static readonly Weekday Monday = new(Values.Monday);

    public static readonly Weekday Tuesday = new(Values.Tuesday);

    public static readonly Weekday Wednesday = new(Values.Wednesday);

    public static readonly Weekday Thursday = new(Values.Thursday);

    public static readonly Weekday Friday = new(Values.Friday);

    public static readonly Weekday Saturday = new(Values.Saturday);

    public static readonly Weekday Sunday = new(Values.Sunday);

    public Weekday(string value)
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
    public static Weekday FromCustom(string value)
    {
        return new Weekday(value);
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

    public static bool operator ==(Weekday value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(Weekday value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(Weekday value) => value.Value;

    public static explicit operator Weekday(string value) => new(value);

    internal class WeekdaySerializer : JsonConverter<Weekday>
    {
        public override Weekday Read(
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
            return new Weekday(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            Weekday value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override Weekday ReadAsPropertyName(
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
            return new Weekday(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Weekday value,
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
        public const string Monday = "monday";

        public const string Tuesday = "tuesday";

        public const string Wednesday = "wednesday";

        public const string Thursday = "thursday";

        public const string Friday = "friday";

        public const string Saturday = "saturday";

        public const string Sunday = "sunday";
    }
}
