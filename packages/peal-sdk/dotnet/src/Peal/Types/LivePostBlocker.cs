using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LivePostBlocker.LivePostBlockerSerializer))]
[Serializable]
public readonly record struct LivePostBlocker : IStringEnum
{
    public static readonly LivePostBlocker NoApi = new(Values.NoApi);

    public static readonly LivePostBlocker Permission = new(Values.Permission);

    public static readonly LivePostBlocker Unverified = new(Values.Unverified);

    public LivePostBlocker(string value)
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
    public static LivePostBlocker FromCustom(string value)
    {
        return new LivePostBlocker(value);
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

    public static bool operator ==(LivePostBlocker value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LivePostBlocker value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LivePostBlocker value) => value.Value;

    public static explicit operator LivePostBlocker(string value) => new(value);

    internal class LivePostBlockerSerializer : JsonConverter<LivePostBlocker>
    {
        public override LivePostBlocker Read(
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
            return new LivePostBlocker(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LivePostBlocker value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LivePostBlocker ReadAsPropertyName(
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
            return new LivePostBlocker(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LivePostBlocker value,
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
        public const string NoApi = "noApi";

        public const string Permission = "permission";

        public const string Unverified = "unverified";
    }
}
