using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedStatus.FeedStatusSerializer))]
[Serializable]
public readonly record struct FeedStatus : IStringEnum
{
    public static readonly FeedStatus Active = new(Values.Active);

    public static readonly FeedStatus Paused = new(Values.Paused);

    public static readonly FeedStatus Stopped = new(Values.Stopped);

    public FeedStatus(string value)
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
    public static FeedStatus FromCustom(string value)
    {
        return new FeedStatus(value);
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

    public static bool operator ==(FeedStatus value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(FeedStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedStatus value) => value.Value;

    public static explicit operator FeedStatus(string value) => new(value);

    internal class FeedStatusSerializer : JsonConverter<FeedStatus>
    {
        public override FeedStatus Read(
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
            return new FeedStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedStatus ReadAsPropertyName(
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
            return new FeedStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedStatus value,
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

        public const string Stopped = "stopped";
    }
}
