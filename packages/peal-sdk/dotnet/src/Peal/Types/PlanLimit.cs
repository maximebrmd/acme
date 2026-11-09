using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PlanLimit.PlanLimitSerializer))]
[Serializable]
public readonly record struct PlanLimit : IStringEnum
{
    public static readonly PlanLimit Channels = new(Values.Channels);

    public static readonly PlanLimit Members = new(Values.Members);

    public static readonly PlanLimit ScheduledPosts = new(Values.ScheduledPosts);

    public static readonly PlanLimit AssistantRequests = new(Values.AssistantRequests);

    public static readonly PlanLimit MediaStorage = new(Values.MediaStorage);

    public PlanLimit(string value)
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
    public static PlanLimit FromCustom(string value)
    {
        return new PlanLimit(value);
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

    public static bool operator ==(PlanLimit value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(PlanLimit value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(PlanLimit value) => value.Value;

    public static explicit operator PlanLimit(string value) => new(value);

    internal class PlanLimitSerializer : JsonConverter<PlanLimit>
    {
        public override PlanLimit Read(
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
            return new PlanLimit(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PlanLimit value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PlanLimit ReadAsPropertyName(
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
            return new PlanLimit(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PlanLimit value,
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
        public const string Channels = "channels";

        public const string Members = "members";

        public const string ScheduledPosts = "scheduledPosts";

        public const string AssistantRequests = "assistantRequests";

        public const string MediaStorage = "mediaStorage";
    }
}
