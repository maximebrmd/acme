using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostTargetStatus.PostTargetStatusSerializer))]
[Serializable]
public readonly record struct PostTargetStatus : IStringEnum
{
    public static readonly PostTargetStatus Pending = new(Values.Pending);

    public static readonly PostTargetStatus Publishing = new(Values.Publishing);

    public static readonly PostTargetStatus Published = new(Values.Published);

    public static readonly PostTargetStatus Failed = new(Values.Failed);

    public static readonly PostTargetStatus Unconfirmed = new(Values.Unconfirmed);

    public static readonly PostTargetStatus Cancelled = new(Values.Cancelled);

    public PostTargetStatus(string value)
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
    public static PostTargetStatus FromCustom(string value)
    {
        return new PostTargetStatus(value);
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

    public static bool operator ==(PostTargetStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PostTargetStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostTargetStatus value) => value.Value;

    public static explicit operator PostTargetStatus(string value) => new(value);

    internal class PostTargetStatusSerializer : JsonConverter<PostTargetStatus>
    {
        public override PostTargetStatus Read(
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
            return new PostTargetStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostTargetStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostTargetStatus ReadAsPropertyName(
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
            return new PostTargetStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostTargetStatus value,
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
        public const string Pending = "pending";

        public const string Publishing = "publishing";

        public const string Published = "published";

        public const string Failed = "failed";

        public const string Unconfirmed = "unconfirmed";

        public const string Cancelled = "cancelled";
    }
}
