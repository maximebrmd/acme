using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentRuleEndReason.CommentRuleEndReasonSerializer))]
[Serializable]
public readonly record struct CommentRuleEndReason : IStringEnum
{
    public static readonly CommentRuleEndReason Stopped = new(Values.Stopped);

    public static readonly CommentRuleEndReason StarterGone = new(Values.StarterGone);

    public CommentRuleEndReason(string value)
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
    public static CommentRuleEndReason FromCustom(string value)
    {
        return new CommentRuleEndReason(value);
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

    public static bool operator ==(CommentRuleEndReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentRuleEndReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentRuleEndReason value) => value.Value;

    public static explicit operator CommentRuleEndReason(string value) => new(value);

    internal class CommentRuleEndReasonSerializer : JsonConverter<CommentRuleEndReason>
    {
        public override CommentRuleEndReason Read(
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
            return new CommentRuleEndReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentRuleEndReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentRuleEndReason ReadAsPropertyName(
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
            return new CommentRuleEndReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentRuleEndReason value,
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
        public const string Stopped = "stopped";

        public const string StarterGone = "starterGone";
    }
}
