using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxCommentState.InboxCommentStateSerializer))]
[Serializable]
public readonly record struct InboxCommentState : IStringEnum
{
    public static readonly InboxCommentState New = new(Values.New);

    public static readonly InboxCommentState Answered = new(Values.Answered);

    public static readonly InboxCommentState Hidden = new(Values.Hidden);

    public static readonly InboxCommentState Deleted = new(Values.Deleted);

    public InboxCommentState(string value)
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
    public static InboxCommentState FromCustom(string value)
    {
        return new InboxCommentState(value);
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

    public static bool operator ==(InboxCommentState value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxCommentState value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxCommentState value) => value.Value;

    public static explicit operator InboxCommentState(string value) => new(value);

    internal class InboxCommentStateSerializer : JsonConverter<InboxCommentState>
    {
        public override InboxCommentState Read(
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
            return new InboxCommentState(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxCommentState value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxCommentState ReadAsPropertyName(
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
            return new InboxCommentState(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxCommentState value,
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
        public const string New = "new";

        public const string Answered = "answered";

        public const string Hidden = "hidden";

        public const string Deleted = "deleted";
    }
}
