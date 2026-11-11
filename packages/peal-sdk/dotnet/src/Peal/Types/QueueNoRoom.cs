using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(QueueNoRoom.QueueNoRoomSerializer))]
[Serializable]
public readonly record struct QueueNoRoom : IStringEnum
{
    public static readonly QueueNoRoom NoSlots = new(Values.NoSlots);

    public static readonly QueueNoRoom Full = new(Values.Full);

    public QueueNoRoom(string value)
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
    public static QueueNoRoom FromCustom(string value)
    {
        return new QueueNoRoom(value);
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

    public static bool operator ==(QueueNoRoom value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(QueueNoRoom value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(QueueNoRoom value) => value.Value;

    public static explicit operator QueueNoRoom(string value) => new(value);

    internal class QueueNoRoomSerializer : JsonConverter<QueueNoRoom>
    {
        public override QueueNoRoom Read(
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
            return new QueueNoRoom(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            QueueNoRoom value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override QueueNoRoom ReadAsPropertyName(
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
            return new QueueNoRoom(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            QueueNoRoom value,
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
        public const string NoSlots = "noSlots";

        public const string Full = "full";
    }
}
