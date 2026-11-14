using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpCapabilitiesCommentNeeds.FollowUpCapabilitiesCommentNeedsSerializer))]
[Serializable]
public readonly record struct FollowUpCapabilitiesCommentNeeds : IStringEnum
{
    public static readonly FollowUpCapabilitiesCommentNeeds PageAdministrator = new(
        Values.PageAdministrator
    );

    public FollowUpCapabilitiesCommentNeeds(string value)
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
    public static FollowUpCapabilitiesCommentNeeds FromCustom(string value)
    {
        return new FollowUpCapabilitiesCommentNeeds(value);
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

    public static bool operator ==(FollowUpCapabilitiesCommentNeeds value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpCapabilitiesCommentNeeds value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpCapabilitiesCommentNeeds value) => value.Value;

    public static explicit operator FollowUpCapabilitiesCommentNeeds(string value) => new(value);

    internal class FollowUpCapabilitiesCommentNeedsSerializer
        : JsonConverter<FollowUpCapabilitiesCommentNeeds>
    {
        public override FollowUpCapabilitiesCommentNeeds Read(
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
            return new FollowUpCapabilitiesCommentNeeds(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpCapabilitiesCommentNeeds value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpCapabilitiesCommentNeeds ReadAsPropertyName(
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
            return new FollowUpCapabilitiesCommentNeeds(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpCapabilitiesCommentNeeds value,
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
        public const string PageAdministrator = "pageAdministrator";
    }
}
