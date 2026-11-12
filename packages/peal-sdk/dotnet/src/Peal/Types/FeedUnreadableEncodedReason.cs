using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedUnreadableEncodedReason.FeedUnreadableEncodedReasonSerializer))]
[Serializable]
public readonly record struct FeedUnreadableEncodedReason : IStringEnum
{
    public static readonly FeedUnreadableEncodedReason NotAFeed = new(Values.NotAFeed);

    public static readonly FeedUnreadableEncodedReason TooLarge = new(Values.TooLarge);

    public static readonly FeedUnreadableEncodedReason Unreachable = new(Values.Unreachable);

    public FeedUnreadableEncodedReason(string value)
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
    public static FeedUnreadableEncodedReason FromCustom(string value)
    {
        return new FeedUnreadableEncodedReason(value);
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

    public static bool operator ==(FeedUnreadableEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedUnreadableEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedUnreadableEncodedReason value) => value.Value;

    public static explicit operator FeedUnreadableEncodedReason(string value) => new(value);

    internal class FeedUnreadableEncodedReasonSerializer
        : JsonConverter<FeedUnreadableEncodedReason>
    {
        public override FeedUnreadableEncodedReason Read(
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
            return new FeedUnreadableEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedUnreadableEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedUnreadableEncodedReason ReadAsPropertyName(
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
            return new FeedUnreadableEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedUnreadableEncodedReason value,
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
        public const string NotAFeed = "notAFeed";

        public const string TooLarge = "tooLarge";

        public const string Unreachable = "unreachable";
    }
}
