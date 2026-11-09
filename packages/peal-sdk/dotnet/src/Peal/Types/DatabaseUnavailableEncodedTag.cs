using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(DatabaseUnavailableEncodedTag.DatabaseUnavailableEncodedTagSerializer))]
[Serializable]
public readonly record struct DatabaseUnavailableEncodedTag : IStringEnum
{
    public static readonly DatabaseUnavailableEncodedTag DatabaseUnavailable = new(
        Values.DatabaseUnavailable
    );

    public DatabaseUnavailableEncodedTag(string value)
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
    public static DatabaseUnavailableEncodedTag FromCustom(string value)
    {
        return new DatabaseUnavailableEncodedTag(value);
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

    public static bool operator ==(DatabaseUnavailableEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DatabaseUnavailableEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DatabaseUnavailableEncodedTag value) => value.Value;

    public static explicit operator DatabaseUnavailableEncodedTag(string value) => new(value);

    internal class DatabaseUnavailableEncodedTagSerializer
        : JsonConverter<DatabaseUnavailableEncodedTag>
    {
        public override DatabaseUnavailableEncodedTag Read(
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
            return new DatabaseUnavailableEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DatabaseUnavailableEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DatabaseUnavailableEncodedTag ReadAsPropertyName(
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
            return new DatabaseUnavailableEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DatabaseUnavailableEncodedTag value,
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
        public const string DatabaseUnavailable = "DatabaseUnavailable";
    }
}
