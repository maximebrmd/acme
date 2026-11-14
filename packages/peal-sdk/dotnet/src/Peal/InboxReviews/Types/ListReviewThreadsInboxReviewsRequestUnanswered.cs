using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(ListReviewThreadsInboxReviewsRequestUnanswered.ListReviewThreadsInboxReviewsRequestUnansweredSerializer)
)]
[Serializable]
public readonly record struct ListReviewThreadsInboxReviewsRequestUnanswered : IStringEnum
{
    public static readonly ListReviewThreadsInboxReviewsRequestUnanswered True = new(Values.True);

    public static readonly ListReviewThreadsInboxReviewsRequestUnanswered False = new(Values.False);

    public ListReviewThreadsInboxReviewsRequestUnanswered(string value)
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
    public static ListReviewThreadsInboxReviewsRequestUnanswered FromCustom(string value)
    {
        return new ListReviewThreadsInboxReviewsRequestUnanswered(value);
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

    public static bool operator ==(
        ListReviewThreadsInboxReviewsRequestUnanswered value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        ListReviewThreadsInboxReviewsRequestUnanswered value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(ListReviewThreadsInboxReviewsRequestUnanswered value) =>
        value.Value;

    public static explicit operator ListReviewThreadsInboxReviewsRequestUnanswered(string value) =>
        new(value);

    internal class ListReviewThreadsInboxReviewsRequestUnansweredSerializer
        : JsonConverter<ListReviewThreadsInboxReviewsRequestUnanswered>
    {
        public override ListReviewThreadsInboxReviewsRequestUnanswered Read(
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
            return new ListReviewThreadsInboxReviewsRequestUnanswered(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListReviewThreadsInboxReviewsRequestUnanswered value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListReviewThreadsInboxReviewsRequestUnanswered ReadAsPropertyName(
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
            return new ListReviewThreadsInboxReviewsRequestUnanswered(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListReviewThreadsInboxReviewsRequestUnanswered value,
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
