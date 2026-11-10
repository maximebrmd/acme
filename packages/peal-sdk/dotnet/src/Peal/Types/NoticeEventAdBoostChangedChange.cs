using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NoticeEventAdBoostChangedChange.NoticeEventAdBoostChangedChangeSerializer))]
[Serializable]
public readonly record struct NoticeEventAdBoostChangedChange : IStringEnum
{
    public static readonly NoticeEventAdBoostChangedChange Started = new(Values.Started);

    public static readonly NoticeEventAdBoostChangedChange Ended = new(Values.Ended);

    public static readonly NoticeEventAdBoostChangedChange Failed = new(Values.Failed);

    public static readonly NoticeEventAdBoostChangedChange BudgetReached = new(
        Values.BudgetReached
    );

    public static readonly NoticeEventAdBoostChangedChange Unconfirmed = new(Values.Unconfirmed);

    public NoticeEventAdBoostChangedChange(string value)
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
    public static NoticeEventAdBoostChangedChange FromCustom(string value)
    {
        return new NoticeEventAdBoostChangedChange(value);
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

    public static bool operator ==(NoticeEventAdBoostChangedChange value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(NoticeEventAdBoostChangedChange value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(NoticeEventAdBoostChangedChange value) => value.Value;

    public static explicit operator NoticeEventAdBoostChangedChange(string value) => new(value);

    internal class NoticeEventAdBoostChangedChangeSerializer
        : JsonConverter<NoticeEventAdBoostChangedChange>
    {
        public override NoticeEventAdBoostChangedChange Read(
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
            return new NoticeEventAdBoostChangedChange(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NoticeEventAdBoostChangedChange value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override NoticeEventAdBoostChangedChange ReadAsPropertyName(
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
            return new NoticeEventAdBoostChangedChange(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NoticeEventAdBoostChangedChange value,
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
        public const string Started = "started";

        public const string Ended = "ended";

        public const string Failed = "failed";

        public const string BudgetReached = "budgetReached";

        public const string Unconfirmed = "unconfirmed";
    }
}
