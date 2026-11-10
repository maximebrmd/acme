using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AnalyticsExportKind.AnalyticsExportKindSerializer))]
[Serializable]
public readonly record struct AnalyticsExportKind : IStringEnum
{
    public static readonly AnalyticsExportKind Posts = new(Values.Posts);

    public static readonly AnalyticsExportKind Accounts = new(Values.Accounts);

    public AnalyticsExportKind(string value)
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
    public static AnalyticsExportKind FromCustom(string value)
    {
        return new AnalyticsExportKind(value);
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

    public static bool operator ==(AnalyticsExportKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AnalyticsExportKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AnalyticsExportKind value) => value.Value;

    public static explicit operator AnalyticsExportKind(string value) => new(value);

    internal class AnalyticsExportKindSerializer : JsonConverter<AnalyticsExportKind>
    {
        public override AnalyticsExportKind Read(
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
            return new AnalyticsExportKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AnalyticsExportKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AnalyticsExportKind ReadAsPropertyName(
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
            return new AnalyticsExportKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AnalyticsExportKind value,
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
        public const string Posts = "posts";

        public const string Accounts = "accounts";
    }
}
