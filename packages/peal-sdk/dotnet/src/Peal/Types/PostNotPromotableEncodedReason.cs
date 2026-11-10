using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostNotPromotableEncodedReason.PostNotPromotableEncodedReasonSerializer))]
[Serializable]
public readonly record struct PostNotPromotableEncodedReason : IStringEnum
{
    public static readonly PostNotPromotableEncodedReason NotPublished = new(Values.NotPublished);

    public static readonly PostNotPromotableEncodedReason Platform = new(Values.Platform);

    public static readonly PostNotPromotableEncodedReason Connection = new(Values.Connection);

    public PostNotPromotableEncodedReason(string value)
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
    public static PostNotPromotableEncodedReason FromCustom(string value)
    {
        return new PostNotPromotableEncodedReason(value);
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

    public static bool operator ==(PostNotPromotableEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostNotPromotableEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostNotPromotableEncodedReason value) => value.Value;

    public static explicit operator PostNotPromotableEncodedReason(string value) => new(value);

    internal class PostNotPromotableEncodedReasonSerializer
        : JsonConverter<PostNotPromotableEncodedReason>
    {
        public override PostNotPromotableEncodedReason Read(
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
            return new PostNotPromotableEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostNotPromotableEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostNotPromotableEncodedReason ReadAsPropertyName(
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
            return new PostNotPromotableEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostNotPromotableEncodedReason value,
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
        public const string NotPublished = "notPublished";

        public const string Platform = "platform";

        public const string Connection = "connection";
    }
}
