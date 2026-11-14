using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentRuleStatus.CommentRuleStatusSerializer))]
[Serializable]
public readonly record struct CommentRuleStatus : IStringEnum
{
    public static readonly CommentRuleStatus Active = new(Values.Active);

    public static readonly CommentRuleStatus Paused = new(Values.Paused);

    public static readonly CommentRuleStatus Ended = new(Values.Ended);

    public CommentRuleStatus(string value)
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
    public static CommentRuleStatus FromCustom(string value)
    {
        return new CommentRuleStatus(value);
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

    public static bool operator ==(CommentRuleStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentRuleStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentRuleStatus value) => value.Value;

    public static explicit operator CommentRuleStatus(string value) => new(value);

    internal class CommentRuleStatusSerializer : JsonConverter<CommentRuleStatus>
    {
        public override CommentRuleStatus Read(
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
            return new CommentRuleStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentRuleStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentRuleStatus ReadAsPropertyName(
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
            return new CommentRuleStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentRuleStatus value,
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
        public const string Active = "active";

        public const string Paused = "paused";

        public const string Ended = "ended";
    }
}
