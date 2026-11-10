using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AnalyticsExportFormat.AnalyticsExportFormatSerializer))]
[Serializable]
public readonly record struct AnalyticsExportFormat : IStringEnum
{
    public static readonly AnalyticsExportFormat Csv = new(Values.Csv);

    public static readonly AnalyticsExportFormat Json = new(Values.Json);

    public AnalyticsExportFormat(string value)
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
    public static AnalyticsExportFormat FromCustom(string value)
    {
        return new AnalyticsExportFormat(value);
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

    public static bool operator ==(AnalyticsExportFormat value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AnalyticsExportFormat value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AnalyticsExportFormat value) => value.Value;

    public static explicit operator AnalyticsExportFormat(string value) => new(value);

    internal class AnalyticsExportFormatSerializer : JsonConverter<AnalyticsExportFormat>
    {
        public override AnalyticsExportFormat Read(
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
            return new AnalyticsExportFormat(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AnalyticsExportFormat value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AnalyticsExportFormat ReadAsPropertyName(
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
            return new AnalyticsExportFormat(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AnalyticsExportFormat value,
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
        public const string Csv = "csv";

        public const string Json = "json";
    }
}
