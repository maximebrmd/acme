using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelConnection.ChannelConnectionSerializer))]
[Serializable]
public readonly record struct ChannelConnection : IStringEnum
{
    public static readonly ChannelConnection InstagramLogin = new(Values.InstagramLogin);

    public static readonly ChannelConnection FacebookLogin = new(Values.FacebookLogin);

    public static readonly ChannelConnection LinkedinProfile = new(Values.LinkedinProfile);

    public static readonly ChannelConnection LinkedinPage = new(Values.LinkedinPage);

    public ChannelConnection(string value)
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
    public static ChannelConnection FromCustom(string value)
    {
        return new ChannelConnection(value);
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

    public static bool operator ==(ChannelConnection value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ChannelConnection value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ChannelConnection value) => value.Value;

    public static explicit operator ChannelConnection(string value) => new(value);

    internal class ChannelConnectionSerializer : JsonConverter<ChannelConnection>
    {
        public override ChannelConnection Read(
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
            return new ChannelConnection(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelConnection value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ChannelConnection ReadAsPropertyName(
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
            return new ChannelConnection(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelConnection value,
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
        public const string InstagramLogin = "instagramLogin";

        public const string FacebookLogin = "facebookLogin";

        public const string LinkedinProfile = "linkedinProfile";

        public const string LinkedinPage = "linkedinPage";
    }
}
