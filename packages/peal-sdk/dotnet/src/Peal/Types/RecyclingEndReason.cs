using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(RecyclingEndReason.RecyclingEndReasonSerializer))]
[Serializable]
public readonly record struct RecyclingEndReason : IStringEnum
{
    public static readonly RecyclingEndReason Completed = new(Values.Completed);

    public static readonly RecyclingEndReason Stopped = new(Values.Stopped);

    public static readonly RecyclingEndReason SourceGone = new(Values.SourceGone);

    public static readonly RecyclingEndReason StarterGone = new(Values.StarterGone);

    public static readonly RecyclingEndReason NoChannels = new(Values.NoChannels);

    public static readonly RecyclingEndReason ContentRejected = new(Values.ContentRejected);

    public static readonly RecyclingEndReason PlanLimit = new(Values.PlanLimit);

    public static readonly RecyclingEndReason QueueGone = new(Values.QueueGone);

    public static readonly RecyclingEndReason QueueFull = new(Values.QueueFull);

    public RecyclingEndReason(string value)
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
    public static RecyclingEndReason FromCustom(string value)
    {
        return new RecyclingEndReason(value);
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

    public static bool operator ==(RecyclingEndReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RecyclingEndReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RecyclingEndReason value) => value.Value;

    public static explicit operator RecyclingEndReason(string value) => new(value);

    internal class RecyclingEndReasonSerializer : JsonConverter<RecyclingEndReason>
    {
        public override RecyclingEndReason Read(
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
            return new RecyclingEndReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RecyclingEndReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RecyclingEndReason ReadAsPropertyName(
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
            return new RecyclingEndReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RecyclingEndReason value,
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
        public const string Completed = "completed";

        public const string Stopped = "stopped";

        public const string SourceGone = "sourceGone";

        public const string StarterGone = "starterGone";

        public const string NoChannels = "noChannels";

        public const string ContentRejected = "contentRejected";

        public const string PlanLimit = "planLimit";

        public const string QueueGone = "queueGone";

        public const string QueueFull = "queueFull";
    }
}
