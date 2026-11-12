using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedItemReason.FeedItemReasonSerializer))]
[Serializable]
public readonly record struct FeedItemReason : IStringEnum
{
    public static readonly FeedItemReason Existing = new(Values.Existing);

    public static readonly FeedItemReason TooMany = new(Values.TooMany);

    public static readonly FeedItemReason Empty = new(Values.Empty);

    public static readonly FeedItemReason ContentRejected = new(Values.ContentRejected);

    public static readonly FeedItemReason PlanLimit = new(Values.PlanLimit);

    public static readonly FeedItemReason QueueFull = new(Values.QueueFull);

    public static readonly FeedItemReason NoChannels = new(Values.NoChannels);

    public static readonly FeedItemReason Duplicate = new(Values.Duplicate);

    public static readonly FeedItemReason QueueGone = new(Values.QueueGone);

    public FeedItemReason(string value)
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
    public static FeedItemReason FromCustom(string value)
    {
        return new FeedItemReason(value);
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

    public static bool operator ==(FeedItemReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedItemReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedItemReason value) => value.Value;

    public static explicit operator FeedItemReason(string value) => new(value);

    internal class FeedItemReasonSerializer : JsonConverter<FeedItemReason>
    {
        public override FeedItemReason Read(
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
            return new FeedItemReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedItemReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedItemReason ReadAsPropertyName(
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
            return new FeedItemReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedItemReason value,
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
        public const string Existing = "existing";

        public const string TooMany = "tooMany";

        public const string Empty = "empty";

        public const string ContentRejected = "contentRejected";

        public const string PlanLimit = "planLimit";

        public const string QueueFull = "queueFull";

        public const string NoChannels = "noChannels";

        public const string Duplicate = "duplicate";

        public const string QueueGone = "queueGone";
    }
}
