using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NotRecyclableReason.NotRecyclableReasonSerializer))]
[Serializable]
public readonly record struct NotRecyclableReason : IStringEnum
{
    public static readonly NotRecyclableReason Draft = new(Values.Draft);

    public static readonly NotRecyclableReason AwaitingApproval = new(Values.AwaitingApproval);

    public static readonly NotRecyclableReason Cancelled = new(Values.Cancelled);

    public static readonly NotRecyclableReason Repeating = new(Values.Repeating);

    public static readonly NotRecyclableReason Occurrence = new(Values.Occurrence);

    public static readonly NotRecyclableReason NoChannels = new(Values.NoChannels);

    public NotRecyclableReason(string value)
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
    public static NotRecyclableReason FromCustom(string value)
    {
        return new NotRecyclableReason(value);
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

    public static bool operator ==(NotRecyclableReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(NotRecyclableReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(NotRecyclableReason value) => value.Value;

    public static explicit operator NotRecyclableReason(string value) => new(value);

    internal class NotRecyclableReasonSerializer : JsonConverter<NotRecyclableReason>
    {
        public override NotRecyclableReason Read(
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
            return new NotRecyclableReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NotRecyclableReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override NotRecyclableReason ReadAsPropertyName(
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
            return new NotRecyclableReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NotRecyclableReason value,
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
        public const string Draft = "draft";

        public const string AwaitingApproval = "awaitingApproval";

        public const string Cancelled = "cancelled";

        public const string Repeating = "repeating";

        public const string Occurrence = "occurrence";

        public const string NoChannels = "noChannels";
    }
}
