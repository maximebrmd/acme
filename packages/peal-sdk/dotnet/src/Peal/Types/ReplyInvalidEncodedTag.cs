using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReplyInvalidEncodedTag.ReplyInvalidEncodedTagSerializer))]
[Serializable]
public readonly record struct ReplyInvalidEncodedTag : IStringEnum
{
    public static readonly ReplyInvalidEncodedTag ReplyInvalid = new(Values.ReplyInvalid);

    public ReplyInvalidEncodedTag(string value)
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
    public static ReplyInvalidEncodedTag FromCustom(string value)
    {
        return new ReplyInvalidEncodedTag(value);
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

    public static bool operator ==(ReplyInvalidEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReplyInvalidEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReplyInvalidEncodedTag value) => value.Value;

    public static explicit operator ReplyInvalidEncodedTag(string value) => new(value);

    internal class ReplyInvalidEncodedTagSerializer : JsonConverter<ReplyInvalidEncodedTag>
    {
        public override ReplyInvalidEncodedTag Read(
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
            return new ReplyInvalidEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReplyInvalidEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReplyInvalidEncodedTag ReadAsPropertyName(
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
            return new ReplyInvalidEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReplyInvalidEncodedTag value,
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
        public const string ReplyInvalid = "ReplyInvalid";
    }
}
