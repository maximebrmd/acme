using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxModerationAction.InboxModerationActionSerializer))]
[Serializable]
public readonly record struct InboxModerationAction : IStringEnum
{
    public static readonly InboxModerationAction Hide = new(Values.Hide);

    public static readonly InboxModerationAction Unhide = new(Values.Unhide);

    public static readonly InboxModerationAction Like = new(Values.Like);

    public static readonly InboxModerationAction Unlike = new(Values.Unlike);

    public static readonly InboxModerationAction Delete = new(Values.Delete);

    public InboxModerationAction(string value)
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
    public static InboxModerationAction FromCustom(string value)
    {
        return new InboxModerationAction(value);
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

    public static bool operator ==(InboxModerationAction value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxModerationAction value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxModerationAction value) => value.Value;

    public static explicit operator InboxModerationAction(string value) => new(value);

    internal class InboxModerationActionSerializer : JsonConverter<InboxModerationAction>
    {
        public override InboxModerationAction Read(
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
            return new InboxModerationAction(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxModerationAction value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxModerationAction ReadAsPropertyName(
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
            return new InboxModerationAction(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxModerationAction value,
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
        public const string Hide = "hide";

        public const string Unhide = "unhide";

        public const string Like = "like";

        public const string Unlike = "unlike";

        public const string Delete = "delete";
    }
}
