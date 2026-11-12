using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedStoppedReason.FeedStoppedReasonSerializer))]
[Serializable]
public readonly record struct FeedStoppedReason : IStringEnum
{
    public static readonly FeedStoppedReason Unreachable = new(Values.Unreachable);

    public static readonly FeedStoppedReason NotAFeed = new(Values.NotAFeed);

    public static readonly FeedStoppedReason Gone = new(Values.Gone);

    public static readonly FeedStoppedReason StarterGone = new(Values.StarterGone);

    public static readonly FeedStoppedReason QueueGone = new(Values.QueueGone);

    public FeedStoppedReason(string value)
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
    public static FeedStoppedReason FromCustom(string value)
    {
        return new FeedStoppedReason(value);
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

    public static bool operator ==(FeedStoppedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedStoppedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedStoppedReason value) => value.Value;

    public static explicit operator FeedStoppedReason(string value) => new(value);

    internal class FeedStoppedReasonSerializer : JsonConverter<FeedStoppedReason>
    {
        public override FeedStoppedReason Read(
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
            return new FeedStoppedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedStoppedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedStoppedReason ReadAsPropertyName(
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
            return new FeedStoppedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedStoppedReason value,
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
        public const string Unreachable = "unreachable";

        public const string NotAFeed = "notAFeed";

        public const string Gone = "gone";

        public const string StarterGone = "starterGone";

        public const string QueueGone = "queueGone";
    }
}
