using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LinkedInVisibility.LinkedInVisibilitySerializer))]
[Serializable]
public readonly record struct LinkedInVisibility : IStringEnum
{
    public static readonly LinkedInVisibility Public = new(Values.Public);

    public static readonly LinkedInVisibility Connections = new(Values.Connections);

    public static readonly LinkedInVisibility LoggedIn = new(Values.LoggedIn);

    public LinkedInVisibility(string value)
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
    public static LinkedInVisibility FromCustom(string value)
    {
        return new LinkedInVisibility(value);
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

    public static bool operator ==(LinkedInVisibility value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LinkedInVisibility value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LinkedInVisibility value) => value.Value;

    public static explicit operator LinkedInVisibility(string value) => new(value);

    internal class LinkedInVisibilitySerializer : JsonConverter<LinkedInVisibility>
    {
        public override LinkedInVisibility Read(
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
            return new LinkedInVisibility(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LinkedInVisibility value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LinkedInVisibility ReadAsPropertyName(
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
            return new LinkedInVisibility(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LinkedInVisibility value,
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
        public const string Public = "public";

        public const string Connections = "connections";

        public const string LoggedIn = "loggedIn";
    }
}
