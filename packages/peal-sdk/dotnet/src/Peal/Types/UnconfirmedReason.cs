using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UnconfirmedReason.UnconfirmedReasonSerializer))]
[Serializable]
public readonly record struct UnconfirmedReason : IStringEnum
{
    public static readonly UnconfirmedReason NoResponse = new(Values.NoResponse);

    public static readonly UnconfirmedReason UnreadableResponse = new(Values.UnreadableResponse);

    public static readonly UnconfirmedReason Interrupted = new(Values.Interrupted);

    public static readonly UnconfirmedReason AdapterFailure = new(Values.AdapterFailure);

    public static readonly UnconfirmedReason StillProcessing = new(Values.StillProcessing);

    public UnconfirmedReason(string value)
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
    public static UnconfirmedReason FromCustom(string value)
    {
        return new UnconfirmedReason(value);
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

    public static bool operator ==(UnconfirmedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UnconfirmedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UnconfirmedReason value) => value.Value;

    public static explicit operator UnconfirmedReason(string value) => new(value);

    internal class UnconfirmedReasonSerializer : JsonConverter<UnconfirmedReason>
    {
        public override UnconfirmedReason Read(
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
            return new UnconfirmedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UnconfirmedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UnconfirmedReason ReadAsPropertyName(
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
            return new UnconfirmedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UnconfirmedReason value,
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
        public const string NoResponse = "noResponse";

        public const string UnreadableResponse = "unreadableResponse";

        public const string Interrupted = "interrupted";

        public const string AdapterFailure = "adapterFailure";

        public const string StillProcessing = "stillProcessing";
    }
}
