using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpRuleStatus.FollowUpRuleStatusSerializer))]
[Serializable]
public readonly record struct FollowUpRuleStatus : IStringEnum
{
    public static readonly FollowUpRuleStatus Active = new(Values.Active);

    public static readonly FollowUpRuleStatus Paused = new(Values.Paused);

    public static readonly FollowUpRuleStatus Ended = new(Values.Ended);

    public FollowUpRuleStatus(string value)
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
    public static FollowUpRuleStatus FromCustom(string value)
    {
        return new FollowUpRuleStatus(value);
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

    public static bool operator ==(FollowUpRuleStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpRuleStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpRuleStatus value) => value.Value;

    public static explicit operator FollowUpRuleStatus(string value) => new(value);

    internal class FollowUpRuleStatusSerializer : JsonConverter<FollowUpRuleStatus>
    {
        public override FollowUpRuleStatus Read(
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
            return new FollowUpRuleStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpRuleStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpRuleStatus ReadAsPropertyName(
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
            return new FollowUpRuleStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpRuleStatus value,
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
