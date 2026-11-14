using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpApprovalState.FollowUpApprovalStateSerializer))]
[Serializable]
public readonly record struct FollowUpApprovalState : IStringEnum
{
    public static readonly FollowUpApprovalState NotNeeded = new(Values.NotNeeded);

    public static readonly FollowUpApprovalState Pending = new(Values.Pending);

    public static readonly FollowUpApprovalState Approved = new(Values.Approved);

    public FollowUpApprovalState(string value)
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
    public static FollowUpApprovalState FromCustom(string value)
    {
        return new FollowUpApprovalState(value);
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

    public static bool operator ==(FollowUpApprovalState value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpApprovalState value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpApprovalState value) => value.Value;

    public static explicit operator FollowUpApprovalState(string value) => new(value);

    internal class FollowUpApprovalStateSerializer : JsonConverter<FollowUpApprovalState>
    {
        public override FollowUpApprovalState Read(
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
            return new FollowUpApprovalState(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpApprovalState value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpApprovalState ReadAsPropertyName(
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
            return new FollowUpApprovalState(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpApprovalState value,
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
        public const string NotNeeded = "notNeeded";

        public const string Pending = "pending";

        public const string Approved = "approved";
    }
}
