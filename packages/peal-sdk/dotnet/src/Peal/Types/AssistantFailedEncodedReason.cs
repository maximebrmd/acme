using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AssistantFailedEncodedReason.AssistantFailedEncodedReasonSerializer))]
[Serializable]
public readonly record struct AssistantFailedEncodedReason : IStringEnum
{
    public static readonly AssistantFailedEncodedReason Unreachable = new(Values.Unreachable);

    public static readonly AssistantFailedEncodedReason TimedOut = new(Values.TimedOut);

    public static readonly AssistantFailedEncodedReason Declined = new(Values.Declined);

    public static readonly AssistantFailedEncodedReason InvalidAnswer = new(Values.InvalidAnswer);

    public AssistantFailedEncodedReason(string value)
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
    public static AssistantFailedEncodedReason FromCustom(string value)
    {
        return new AssistantFailedEncodedReason(value);
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

    public static bool operator ==(AssistantFailedEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantFailedEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantFailedEncodedReason value) => value.Value;

    public static explicit operator AssistantFailedEncodedReason(string value) => new(value);

    internal class AssistantFailedEncodedReasonSerializer
        : JsonConverter<AssistantFailedEncodedReason>
    {
        public override AssistantFailedEncodedReason Read(
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
            return new AssistantFailedEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantFailedEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantFailedEncodedReason ReadAsPropertyName(
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
            return new AssistantFailedEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantFailedEncodedReason value,
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

        public const string TimedOut = "timedOut";

        public const string Declined = "declined";

        public const string InvalidAnswer = "invalidAnswer";
    }
}
