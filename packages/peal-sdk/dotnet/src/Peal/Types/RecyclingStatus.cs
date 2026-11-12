using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(RecyclingStatus.RecyclingStatusSerializer))]
[Serializable]
public readonly record struct RecyclingStatus : IStringEnum
{
    public static readonly RecyclingStatus Active = new(Values.Active);

    public static readonly RecyclingStatus Paused = new(Values.Paused);

    public static readonly RecyclingStatus Ended = new(Values.Ended);

    public RecyclingStatus(string value)
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
    public static RecyclingStatus FromCustom(string value)
    {
        return new RecyclingStatus(value);
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

    public static bool operator ==(RecyclingStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(RecyclingStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(RecyclingStatus value) => value.Value;

    public static explicit operator RecyclingStatus(string value) => new(value);

    internal class RecyclingStatusSerializer : JsonConverter<RecyclingStatus>
    {
        public override RecyclingStatus Read(
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
            return new RecyclingStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            RecyclingStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override RecyclingStatus ReadAsPropertyName(
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
            return new RecyclingStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            RecyclingStatus value,
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
        public const string Active = "active";

        public const string Paused = "paused";

        public const string Ended = "ended";
    }
}
