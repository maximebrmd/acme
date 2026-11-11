using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(XReplySettings.XReplySettingsSerializer))]
[Serializable]
public readonly record struct XReplySettings : IStringEnum
{
    public static readonly XReplySettings Following = new(Values.Following);

    public static readonly XReplySettings MentionedUsers = new(Values.MentionedUsers);

    public static readonly XReplySettings Subscribers = new(Values.Subscribers);

    public static readonly XReplySettings Verified = new(Values.Verified);

    public XReplySettings(string value)
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
    public static XReplySettings FromCustom(string value)
    {
        return new XReplySettings(value);
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

    public static bool operator ==(XReplySettings value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(XReplySettings value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(XReplySettings value) => value.Value;

    public static explicit operator XReplySettings(string value) => new(value);

    internal class XReplySettingsSerializer : JsonConverter<XReplySettings>
    {
        public override XReplySettings Read(
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
            return new XReplySettings(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            XReplySettings value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override XReplySettings ReadAsPropertyName(
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
            return new XReplySettings(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            XReplySettings value,
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
        public const string Following = "following";

        public const string MentionedUsers = "mentionedUsers";

        public const string Subscribers = "subscribers";

        public const string Verified = "verified";
    }
}
