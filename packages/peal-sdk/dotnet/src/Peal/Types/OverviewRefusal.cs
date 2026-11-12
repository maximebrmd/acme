using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(OverviewRefusal.OverviewRefusalSerializer))]
[Serializable]
public readonly record struct OverviewRefusal : IStringEnum
{
    public static readonly OverviewRefusal TwoStepRequired = new(Values.TwoStepRequired);

    public OverviewRefusal(string value)
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
    public static OverviewRefusal FromCustom(string value)
    {
        return new OverviewRefusal(value);
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

    public static bool operator ==(OverviewRefusal value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(OverviewRefusal value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(OverviewRefusal value) => value.Value;

    public static explicit operator OverviewRefusal(string value) => new(value);

    internal class OverviewRefusalSerializer : JsonConverter<OverviewRefusal>
    {
        public override OverviewRefusal Read(
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
            return new OverviewRefusal(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            OverviewRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override OverviewRefusal ReadAsPropertyName(
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
            return new OverviewRefusal(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            OverviewRefusal value,
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
        public const string TwoStepRequired = "twoStepRequired";
    }
}
