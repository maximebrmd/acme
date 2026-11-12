using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(RecyclingNoticeReason.RecyclingNoticeReasonSerializer))]
[Serializable]
public readonly record struct RecyclingNoticeReason : IStringEnum
{
    public static readonly RecyclingNoticeReason SourceGone = new(Values.SourceGone);

    public static readonly RecyclingNoticeReason StarterGone = new(Values.StarterGone);

    public static readonly RecyclingNoticeReason NoChannels = new(Values.NoChannels);

    public static readonly RecyclingNoticeReason ContentRejected = new(Values.ContentRejected);

    public static readonly RecyclingNoticeReason PlanLimit = new(Values.PlanLimit);

    public static readonly RecyclingNoticeReason QueueGone = new(Values.QueueGone);

    public static readonly RecyclingNoticeReason QueueFull = new(Values.QueueFull);

    public static readonly RecyclingNoticeReason SourceWithdrawn = new(Values.SourceWithdrawn);

    public RecyclingNoticeReason(string value)
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
    public static RecyclingNoticeReason FromCustom(string value)
    {
        return new RecyclingNoticeReason(value);
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

    public static bool operator ==(RecyclingNoticeReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RecyclingNoticeReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RecyclingNoticeReason value) => value.Value;

    public static explicit operator RecyclingNoticeReason(string value) => new(value);

    internal class RecyclingNoticeReasonSerializer : JsonConverter<RecyclingNoticeReason>
    {
        public override RecyclingNoticeReason Read(
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
            return new RecyclingNoticeReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RecyclingNoticeReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RecyclingNoticeReason ReadAsPropertyName(
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
            return new RecyclingNoticeReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RecyclingNoticeReason value,
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
        public const string SourceGone = "sourceGone";

        public const string StarterGone = "starterGone";

        public const string NoChannels = "noChannels";

        public const string ContentRejected = "contentRejected";

        public const string PlanLimit = "planLimit";

        public const string QueueGone = "queueGone";

        public const string QueueFull = "queueFull";

        public const string SourceWithdrawn = "sourceWithdrawn";
    }
}
