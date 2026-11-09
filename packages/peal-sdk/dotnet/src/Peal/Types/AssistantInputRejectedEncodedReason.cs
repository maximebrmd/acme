using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(AssistantInputRejectedEncodedReason.AssistantInputRejectedEncodedReasonSerializer)
)]
[Serializable]
public readonly record struct AssistantInputRejectedEncodedReason : IStringEnum
{
    public static readonly AssistantInputRejectedEncodedReason Empty = new(Values.Empty);

    public static readonly AssistantInputRejectedEncodedReason TooLong = new(Values.TooLong);

    public AssistantInputRejectedEncodedReason(string value)
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
    public static AssistantInputRejectedEncodedReason FromCustom(string value)
    {
        return new AssistantInputRejectedEncodedReason(value);
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

    public static bool operator ==(AssistantInputRejectedEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AssistantInputRejectedEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AssistantInputRejectedEncodedReason value) =>
        value.Value;

    public static explicit operator AssistantInputRejectedEncodedReason(string value) => new(value);

    internal class AssistantInputRejectedEncodedReasonSerializer
        : JsonConverter<AssistantInputRejectedEncodedReason>
    {
        public override AssistantInputRejectedEncodedReason Read(
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
            return new AssistantInputRejectedEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AssistantInputRejectedEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AssistantInputRejectedEncodedReason ReadAsPropertyName(
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
            return new AssistantInputRejectedEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AssistantInputRejectedEncodedReason value,
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
        public const string Empty = "empty";

        public const string TooLong = "tooLong";
    }
}
