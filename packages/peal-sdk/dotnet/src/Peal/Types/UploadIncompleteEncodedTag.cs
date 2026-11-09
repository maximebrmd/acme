using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UploadIncompleteEncodedTag.UploadIncompleteEncodedTagSerializer))]
[Serializable]
public readonly record struct UploadIncompleteEncodedTag : IStringEnum
{
    public static readonly UploadIncompleteEncodedTag UploadIncomplete = new(
        Values.UploadIncomplete
    );

    public UploadIncompleteEncodedTag(string value)
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
    public static UploadIncompleteEncodedTag FromCustom(string value)
    {
        return new UploadIncompleteEncodedTag(value);
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

    public static bool operator ==(UploadIncompleteEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UploadIncompleteEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UploadIncompleteEncodedTag value) => value.Value;

    public static explicit operator UploadIncompleteEncodedTag(string value) => new(value);

    internal class UploadIncompleteEncodedTagSerializer : JsonConverter<UploadIncompleteEncodedTag>
    {
        public override UploadIncompleteEncodedTag Read(
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
            return new UploadIncompleteEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UploadIncompleteEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UploadIncompleteEncodedTag ReadAsPropertyName(
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
            return new UploadIncompleteEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UploadIncompleteEncodedTag value,
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
        public const string UploadIncomplete = "UploadIncomplete";
    }
}
