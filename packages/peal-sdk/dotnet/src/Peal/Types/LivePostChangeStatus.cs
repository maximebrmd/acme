using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LivePostChangeStatus.LivePostChangeStatusSerializer))]
[Serializable]
public readonly record struct LivePostChangeStatus : IStringEnum
{
    public static readonly LivePostChangeStatus Pending = new(Values.Pending);

    public static readonly LivePostChangeStatus Done = new(Values.Done);

    public static readonly LivePostChangeStatus Failed = new(Values.Failed);

    public LivePostChangeStatus(string value)
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
    public static LivePostChangeStatus FromCustom(string value)
    {
        return new LivePostChangeStatus(value);
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

    public static bool operator ==(LivePostChangeStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LivePostChangeStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LivePostChangeStatus value) => value.Value;

    public static explicit operator LivePostChangeStatus(string value) => new(value);

    internal class LivePostChangeStatusSerializer : JsonConverter<LivePostChangeStatus>
    {
        public override LivePostChangeStatus Read(
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
            return new LivePostChangeStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LivePostChangeStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LivePostChangeStatus ReadAsPropertyName(
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
            return new LivePostChangeStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LivePostChangeStatus value,
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
        public const string Pending = "pending";

        public const string Done = "done";

        public const string Failed = "failed";
    }
}
