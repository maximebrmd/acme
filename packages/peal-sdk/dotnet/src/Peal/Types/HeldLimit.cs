using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(HeldLimit.HeldLimitSerializer))]
[Serializable]
public readonly record struct HeldLimit : IStringEnum
{
    public static readonly HeldLimit Channels = new(Values.Channels);

    public static readonly HeldLimit Members = new(Values.Members);

    public static readonly HeldLimit MediaStorage = new(Values.MediaStorage);

    public HeldLimit(string value)
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
    public static HeldLimit FromCustom(string value)
    {
        return new HeldLimit(value);
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

    public static bool operator ==(HeldLimit value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(HeldLimit value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(HeldLimit value) => value.Value;

    public static explicit operator HeldLimit(string value) => new(value);

    internal class HeldLimitSerializer : JsonConverter<HeldLimit>
    {
        public override HeldLimit Read(
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
            return new HeldLimit(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HeldLimit value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HeldLimit ReadAsPropertyName(
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
            return new HeldLimit(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HeldLimit value,
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
        public const string Channels = "channels";

        public const string Members = "members";

        public const string MediaStorage = "mediaStorage";
    }
}
