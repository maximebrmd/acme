using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(ListThreadsInboxRequestUnanswered.ListThreadsInboxRequestUnansweredSerializer)
)]
[Serializable]
public readonly record struct ListThreadsInboxRequestUnanswered : IStringEnum
{
    public static readonly ListThreadsInboxRequestUnanswered True = new(Values.True);

    public static readonly ListThreadsInboxRequestUnanswered False = new(Values.False);

    public ListThreadsInboxRequestUnanswered(string value)
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
    public static ListThreadsInboxRequestUnanswered FromCustom(string value)
    {
        return new ListThreadsInboxRequestUnanswered(value);
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

    public static bool operator ==(ListThreadsInboxRequestUnanswered value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ListThreadsInboxRequestUnanswered value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ListThreadsInboxRequestUnanswered value) => value.Value;

    public static explicit operator ListThreadsInboxRequestUnanswered(string value) => new(value);

    internal class ListThreadsInboxRequestUnansweredSerializer
        : JsonConverter<ListThreadsInboxRequestUnanswered>
    {
        public override ListThreadsInboxRequestUnanswered Read(
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
            return new ListThreadsInboxRequestUnanswered(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListThreadsInboxRequestUnanswered value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListThreadsInboxRequestUnanswered ReadAsPropertyName(
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
            return new ListThreadsInboxRequestUnanswered(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListThreadsInboxRequestUnanswered value,
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
        public const string True = "true";

        public const string False = "false";
    }
}
