using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReplyInvalidEncodedReason.ReplyInvalidEncodedReasonSerializer))]
[Serializable]
public readonly record struct ReplyInvalidEncodedReason : IStringEnum
{
    public static readonly ReplyInvalidEncodedReason Empty = new(Values.Empty);

    public static readonly ReplyInvalidEncodedReason TooLong = new(Values.TooLong);

    public ReplyInvalidEncodedReason(string value)
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
    public static ReplyInvalidEncodedReason FromCustom(string value)
    {
        return new ReplyInvalidEncodedReason(value);
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

    public static bool operator ==(ReplyInvalidEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReplyInvalidEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReplyInvalidEncodedReason value) => value.Value;

    public static explicit operator ReplyInvalidEncodedReason(string value) => new(value);

    internal class ReplyInvalidEncodedReasonSerializer : JsonConverter<ReplyInvalidEncodedReason>
    {
        public override ReplyInvalidEncodedReason Read(
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
            return new ReplyInvalidEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReplyInvalidEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReplyInvalidEncodedReason ReadAsPropertyName(
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
            return new ReplyInvalidEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReplyInvalidEncodedReason value,
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
        public const string Empty = "empty";

        public const string TooLong = "tooLong";
    }
}
