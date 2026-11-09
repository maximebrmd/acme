using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConnectFailedEncodedTag.ConnectFailedEncodedTagSerializer))]
[Serializable]
public readonly record struct ConnectFailedEncodedTag : IStringEnum
{
    public static readonly ConnectFailedEncodedTag ConnectFailed = new(Values.ConnectFailed);

    public ConnectFailedEncodedTag(string value)
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
    public static ConnectFailedEncodedTag FromCustom(string value)
    {
        return new ConnectFailedEncodedTag(value);
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

    public static bool operator ==(ConnectFailedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ConnectFailedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ConnectFailedEncodedTag value) => value.Value;

    public static explicit operator ConnectFailedEncodedTag(string value) => new(value);

    internal class ConnectFailedEncodedTagSerializer : JsonConverter<ConnectFailedEncodedTag>
    {
        public override ConnectFailedEncodedTag Read(
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
            return new ConnectFailedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConnectFailedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ConnectFailedEncodedTag ReadAsPropertyName(
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
            return new ConnectFailedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConnectFailedEncodedTag value,
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
        public const string ConnectFailed = "ConnectFailed";
    }
}
