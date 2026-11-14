using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ReconnectChannelsRequestReposts.ReconnectChannelsRequestRepostsSerializer))]
[Serializable]
public readonly record struct ReconnectChannelsRequestReposts : IStringEnum
{
    public static readonly ReconnectChannelsRequestReposts True = new(Values.True);

    public static readonly ReconnectChannelsRequestReposts False = new(Values.False);

    public ReconnectChannelsRequestReposts(string value)
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
    public static ReconnectChannelsRequestReposts FromCustom(string value)
    {
        return new ReconnectChannelsRequestReposts(value);
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

    public static bool operator ==(ReconnectChannelsRequestReposts value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ReconnectChannelsRequestReposts value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ReconnectChannelsRequestReposts value) => value.Value;

    public static explicit operator ReconnectChannelsRequestReposts(string value) => new(value);

    internal class ReconnectChannelsRequestRepostsSerializer
        : JsonConverter<ReconnectChannelsRequestReposts>
    {
        public override ReconnectChannelsRequestReposts Read(
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
            return new ReconnectChannelsRequestReposts(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ReconnectChannelsRequestReposts value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ReconnectChannelsRequestReposts ReadAsPropertyName(
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
            return new ReconnectChannelsRequestReposts(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ReconnectChannelsRequestReposts value,
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
