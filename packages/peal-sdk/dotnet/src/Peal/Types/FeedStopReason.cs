using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedStopReason.FeedStopReasonSerializer))]
[Serializable]
public readonly record struct FeedStopReason : IStringEnum
{
    public static readonly FeedStopReason Unreachable = new(Values.Unreachable);

    public static readonly FeedStopReason NotAFeed = new(Values.NotAFeed);

    public static readonly FeedStopReason Gone = new(Values.Gone);

    public static readonly FeedStopReason StarterGone = new(Values.StarterGone);

    public static readonly FeedStopReason QueueGone = new(Values.QueueGone);

    public FeedStopReason(string value)
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
    public static FeedStopReason FromCustom(string value)
    {
        return new FeedStopReason(value);
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

    public static bool operator ==(FeedStopReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedStopReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedStopReason value) => value.Value;

    public static explicit operator FeedStopReason(string value) => new(value);

    internal class FeedStopReasonSerializer : JsonConverter<FeedStopReason>
    {
        public override FeedStopReason Read(
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
            return new FeedStopReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedStopReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedStopReason ReadAsPropertyName(
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
            return new FeedStopReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedStopReason value,
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
