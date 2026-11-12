using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedTemplateInvalidEncodedReason.FeedTemplateInvalidEncodedReasonSerializer))]
[Serializable]
public readonly record struct FeedTemplateInvalidEncodedReason : IStringEnum
{
    public static readonly FeedTemplateInvalidEncodedReason Empty = new(Values.Empty);

    public static readonly FeedTemplateInvalidEncodedReason TooLong = new(Values.TooLong);

    public static readonly FeedTemplateInvalidEncodedReason UnknownPlaceholder = new(
        Values.UnknownPlaceholder
    );

    public FeedTemplateInvalidEncodedReason(string value)
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
    public static FeedTemplateInvalidEncodedReason FromCustom(string value)
    {
        return new FeedTemplateInvalidEncodedReason(value);
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

    public static bool operator ==(FeedTemplateInvalidEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedTemplateInvalidEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedTemplateInvalidEncodedReason value) => value.Value;

    public static explicit operator FeedTemplateInvalidEncodedReason(string value) => new(value);

    internal class FeedTemplateInvalidEncodedReasonSerializer
        : JsonConverter<FeedTemplateInvalidEncodedReason>
    {
        public override FeedTemplateInvalidEncodedReason Read(
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
            return new FeedTemplateInvalidEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedTemplateInvalidEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedTemplateInvalidEncodedReason ReadAsPropertyName(
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
            return new FeedTemplateInvalidEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedTemplateInvalidEncodedReason value,
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

        public const string UnknownPlaceholder = "unknownPlaceholder";
    }
}
