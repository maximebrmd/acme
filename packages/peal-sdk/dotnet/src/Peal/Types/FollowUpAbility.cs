using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpAbility.FollowUpAbilitySerializer))]
[Serializable]
public readonly record struct FollowUpAbility : IStringEnum
{
    public static readonly FollowUpAbility Available = new(Values.Available);

    public static readonly FollowUpAbility NotAsked = new(Values.NotAsked);

    public static readonly FollowUpAbility NoApi = new(Values.NoApi);

    public static readonly FollowUpAbility Review = new(Values.Review);

    public static readonly FollowUpAbility NotBuilt = new(Values.NotBuilt);

    public static readonly FollowUpAbility NotAllowed = new(Values.NotAllowed);

    public static readonly FollowUpAbility TurnedOff = new(Values.TurnedOff);

    public static readonly FollowUpAbility Reconnect = new(Values.Reconnect);

    public static readonly FollowUpAbility NotCounted = new(Values.NotCounted);

    public static readonly FollowUpAbility TextTooLong = new(Values.TextTooLong);

    public FollowUpAbility(string value)
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
    public static FollowUpAbility FromCustom(string value)
    {
        return new FollowUpAbility(value);
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

    public static bool operator ==(FollowUpAbility value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpAbility value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpAbility value) => value.Value;

    public static explicit operator FollowUpAbility(string value) => new(value);

    internal class FollowUpAbilitySerializer : JsonConverter<FollowUpAbility>
    {
        public override FollowUpAbility Read(
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
            return new FollowUpAbility(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpAbility value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpAbility ReadAsPropertyName(
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
            return new FollowUpAbility(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpAbility value,
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
        public const string Available = "available";

        public const string NotAsked = "notAsked";

        public const string NoApi = "noApi";

        public const string Review = "review";

        public const string NotBuilt = "notBuilt";

        public const string NotAllowed = "notAllowed";

        public const string TurnedOff = "turnedOff";

        public const string Reconnect = "reconnect";

        public const string NotCounted = "notCounted";

        public const string TextTooLong = "textTooLong";
    }
}
