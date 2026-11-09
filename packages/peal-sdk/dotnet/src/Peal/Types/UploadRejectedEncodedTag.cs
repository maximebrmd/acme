using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UploadRejectedEncodedTag.UploadRejectedEncodedTagSerializer))]
[Serializable]
public readonly record struct UploadRejectedEncodedTag : IStringEnum
{
    public static readonly UploadRejectedEncodedTag UploadRejected = new(Values.UploadRejected);

    public UploadRejectedEncodedTag(string value)
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
    public static UploadRejectedEncodedTag FromCustom(string value)
    {
        return new UploadRejectedEncodedTag(value);
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

    public static bool operator ==(UploadRejectedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UploadRejectedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UploadRejectedEncodedTag value) => value.Value;

    public static explicit operator UploadRejectedEncodedTag(string value) => new(value);

    internal class UploadRejectedEncodedTagSerializer : JsonConverter<UploadRejectedEncodedTag>
    {
        public override UploadRejectedEncodedTag Read(
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
            return new UploadRejectedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UploadRejectedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UploadRejectedEncodedTag ReadAsPropertyName(
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
            return new UploadRejectedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UploadRejectedEncodedTag value,
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
        public const string UploadRejected = "UploadRejected";
    }
}
