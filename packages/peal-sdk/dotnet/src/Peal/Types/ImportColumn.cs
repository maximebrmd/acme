using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImportColumn.ImportColumnSerializer))]
[Serializable]
public readonly record struct ImportColumn : IStringEnum
{
    public static readonly ImportColumn Text = new(Values.Text);

    public static readonly ImportColumn Channels = new(Values.Channels);

    public static readonly ImportColumn Media = new(Values.Media);

    public static readonly ImportColumn At = new(Values.At);

    public static readonly ImportColumn TimeZone = new(Values.TimeZone);

    public static readonly ImportColumn AllowDuplicate = new(Values.AllowDuplicate);

    public static readonly ImportColumn IdempotencyKey = new(Values.IdempotencyKey);

    public ImportColumn(string value)
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
    public static ImportColumn FromCustom(string value)
    {
        return new ImportColumn(value);
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

    public static bool operator ==(ImportColumn value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImportColumn value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImportColumn value) => value.Value;

    public static explicit operator ImportColumn(string value) => new(value);

    internal class ImportColumnSerializer : JsonConverter<ImportColumn>
    {
        public override ImportColumn Read(
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
            return new ImportColumn(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImportColumn value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImportColumn ReadAsPropertyName(
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
            return new ImportColumn(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImportColumn value,
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
        public const string Text = "text";

        public const string Channels = "channels";

        public const string Media = "media";

        public const string At = "at";

        public const string TimeZone = "time_zone";

        public const string AllowDuplicate = "allow_duplicate";

        public const string IdempotencyKey = "idempotency_key";
    }
}
