using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LivePostNotChangeableEncodedTag.LivePostNotChangeableEncodedTagSerializer))]
[Serializable]
public readonly record struct LivePostNotChangeableEncodedTag : IStringEnum
{
    public static readonly LivePostNotChangeableEncodedTag LivePostNotChangeable = new(
        Values.LivePostNotChangeable
    );

    public LivePostNotChangeableEncodedTag(string value)
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
    public static LivePostNotChangeableEncodedTag FromCustom(string value)
    {
        return new LivePostNotChangeableEncodedTag(value);
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

    public static bool operator ==(LivePostNotChangeableEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LivePostNotChangeableEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LivePostNotChangeableEncodedTag value) => value.Value;

    public static explicit operator LivePostNotChangeableEncodedTag(string value) => new(value);

    internal class LivePostNotChangeableEncodedTagSerializer
        : JsonConverter<LivePostNotChangeableEncodedTag>
    {
        public override LivePostNotChangeableEncodedTag Read(
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
            return new LivePostNotChangeableEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LivePostNotChangeableEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LivePostNotChangeableEncodedTag ReadAsPropertyName(
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
            return new LivePostNotChangeableEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LivePostNotChangeableEncodedTag value,
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
        public const string LivePostNotChangeable = "LivePostNotChangeable";
    }
}
