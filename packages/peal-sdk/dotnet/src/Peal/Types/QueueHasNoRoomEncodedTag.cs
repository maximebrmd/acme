using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(QueueHasNoRoomEncodedTag.QueueHasNoRoomEncodedTagSerializer))]
[Serializable]
public readonly record struct QueueHasNoRoomEncodedTag : IStringEnum
{
    public static readonly QueueHasNoRoomEncodedTag QueueHasNoRoom = new(Values.QueueHasNoRoom);

    public QueueHasNoRoomEncodedTag(string value)
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
    public static QueueHasNoRoomEncodedTag FromCustom(string value)
    {
        return new QueueHasNoRoomEncodedTag(value);
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

    public static bool operator ==(QueueHasNoRoomEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(QueueHasNoRoomEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(QueueHasNoRoomEncodedTag value) => value.Value;

    public static explicit operator QueueHasNoRoomEncodedTag(string value) => new(value);

    internal class QueueHasNoRoomEncodedTagSerializer : JsonConverter<QueueHasNoRoomEncodedTag>
    {
        public override QueueHasNoRoomEncodedTag Read(
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
            return new QueueHasNoRoomEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            QueueHasNoRoomEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override QueueHasNoRoomEncodedTag ReadAsPropertyName(
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
            return new QueueHasNoRoomEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            QueueHasNoRoomEncodedTag value,
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
        public const string QueueHasNoRoom = "QueueHasNoRoom";
    }
}
