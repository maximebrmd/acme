using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ImportUnreadableEncodedTag.ImportUnreadableEncodedTagSerializer))]
[Serializable]
public readonly record struct ImportUnreadableEncodedTag : IStringEnum
{
    public static readonly ImportUnreadableEncodedTag ImportUnreadable = new(
        Values.ImportUnreadable
    );

    public ImportUnreadableEncodedTag(string value)
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
    public static ImportUnreadableEncodedTag FromCustom(string value)
    {
        return new ImportUnreadableEncodedTag(value);
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

    public static bool operator ==(ImportUnreadableEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ImportUnreadableEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ImportUnreadableEncodedTag value) => value.Value;

    public static explicit operator ImportUnreadableEncodedTag(string value) => new(value);

    internal class ImportUnreadableEncodedTagSerializer : JsonConverter<ImportUnreadableEncodedTag>
    {
        public override ImportUnreadableEncodedTag Read(
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
            return new ImportUnreadableEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ImportUnreadableEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ImportUnreadableEncodedTag ReadAsPropertyName(
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
            return new ImportUnreadableEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ImportUnreadableEncodedTag value,
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
        public const string ImportUnreadable = "ImportUnreadable";
    }
}
