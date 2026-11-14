using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpRefusal.FollowUpRefusalSerializer))]
[Serializable]
public readonly record struct FollowUpRefusal : IStringEnum
{
    public static readonly FollowUpRefusal NoAction = new(Values.NoAction);

    public static readonly FollowUpRefusal EmptyComment = new(Values.EmptyComment);

    public static readonly FollowUpRefusal PostCancelled = new(Values.PostCancelled);

    public static readonly FollowUpRefusal NoChannel = new(Values.NoChannel);

    public static readonly FollowUpRefusal AlreadyFollowedUp = new(Values.AlreadyFollowedUp);

    public static readonly FollowUpRefusal Channels = new(Values.Channels);

    public FollowUpRefusal(string value)
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
    public static FollowUpRefusal FromCustom(string value)
    {
        return new FollowUpRefusal(value);
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

    public static bool operator ==(FollowUpRefusal value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpRefusal value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpRefusal value) => value.Value;

    public static explicit operator FollowUpRefusal(string value) => new(value);

    internal class FollowUpRefusalSerializer : JsonConverter<FollowUpRefusal>
    {
        public override FollowUpRefusal Read(
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
            return new FollowUpRefusal(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpRefusal ReadAsPropertyName(
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
            return new FollowUpRefusal(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpRefusal value,
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
        public const string NoAction = "noAction";

        public const string EmptyComment = "emptyComment";

        public const string PostCancelled = "postCancelled";

        public const string NoChannel = "noChannel";

        public const string AlreadyFollowedUp = "alreadyFollowedUp";

        public const string Channels = "channels";
    }
}
