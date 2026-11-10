using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostNotReviewableEncodedStatus.PostNotReviewableEncodedStatusSerializer))]
[Serializable]
public readonly record struct PostNotReviewableEncodedStatus : IStringEnum
{
    public static readonly PostNotReviewableEncodedStatus Published = new(Values.Published);

    public static readonly PostNotReviewableEncodedStatus Cancelled = new(Values.Cancelled);

    public PostNotReviewableEncodedStatus(string value)
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
    public static PostNotReviewableEncodedStatus FromCustom(string value)
    {
        return new PostNotReviewableEncodedStatus(value);
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

    public static bool operator ==(PostNotReviewableEncodedStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostNotReviewableEncodedStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostNotReviewableEncodedStatus value) => value.Value;

    public static explicit operator PostNotReviewableEncodedStatus(string value) => new(value);

    internal class PostNotReviewableEncodedStatusSerializer
        : JsonConverter<PostNotReviewableEncodedStatus>
    {
        public override PostNotReviewableEncodedStatus Read(
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
            return new PostNotReviewableEncodedStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostNotReviewableEncodedStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostNotReviewableEncodedStatus ReadAsPropertyName(
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
            return new PostNotReviewableEncodedStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostNotReviewableEncodedStatus value,
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
        public const string Published = "published";

        public const string Cancelled = "cancelled";
    }
}
