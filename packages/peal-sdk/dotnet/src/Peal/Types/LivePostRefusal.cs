using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LivePostRefusal.LivePostRefusalSerializer))]
[Serializable]
public readonly record struct LivePostRefusal : IStringEnum
{
    public static readonly LivePostRefusal NotPublished = new(Values.NotPublished);

    public static readonly LivePostRefusal AlreadyRemoved = new(Values.AlreadyRemoved);

    public static readonly LivePostRefusal NoPlatformId = new(Values.NoPlatformId);

    public static readonly LivePostRefusal NotSupported = new(Values.NotSupported);

    public static readonly LivePostRefusal ChangeInProgress = new(Values.ChangeInProgress);

    public static readonly LivePostRefusal ChannelUnavailable = new(Values.ChannelUnavailable);

    public static readonly LivePostRefusal BoostRunning = new(Values.BoostRunning);

    public static readonly LivePostRefusal ApprovalRequired = new(Values.ApprovalRequired);

    public LivePostRefusal(string value)
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
    public static LivePostRefusal FromCustom(string value)
    {
        return new LivePostRefusal(value);
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

    public static bool operator ==(LivePostRefusal value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LivePostRefusal value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LivePostRefusal value) => value.Value;

    public static explicit operator LivePostRefusal(string value) => new(value);

    internal class LivePostRefusalSerializer : JsonConverter<LivePostRefusal>
    {
        public override LivePostRefusal Read(
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
            return new LivePostRefusal(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LivePostRefusal value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LivePostRefusal ReadAsPropertyName(
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
            return new LivePostRefusal(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LivePostRefusal value,
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
        public const string NotPublished = "notPublished";

        public const string AlreadyRemoved = "alreadyRemoved";

        public const string NoPlatformId = "noPlatformId";

        public const string NotSupported = "notSupported";

        public const string ChangeInProgress = "changeInProgress";

        public const string ChannelUnavailable = "channelUnavailable";

        public const string BoostRunning = "boostRunning";

        public const string ApprovalRequired = "approvalRequired";
    }
}
