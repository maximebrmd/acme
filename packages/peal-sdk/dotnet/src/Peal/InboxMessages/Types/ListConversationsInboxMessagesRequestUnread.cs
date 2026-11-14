using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(ListConversationsInboxMessagesRequestUnread.ListConversationsInboxMessagesRequestUnreadSerializer)
)]
[Serializable]
public readonly record struct ListConversationsInboxMessagesRequestUnread : IStringEnum
{
    public static readonly ListConversationsInboxMessagesRequestUnread True = new(Values.True);

    public static readonly ListConversationsInboxMessagesRequestUnread False = new(Values.False);

    public ListConversationsInboxMessagesRequestUnread(string value)
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
    public static ListConversationsInboxMessagesRequestUnread FromCustom(string value)
    {
        return new ListConversationsInboxMessagesRequestUnread(value);
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

    public static bool operator ==(
        ListConversationsInboxMessagesRequestUnread value1,
        string value2
    ) => value1.Value.Equals(value2);

    public static bool operator !=(
        ListConversationsInboxMessagesRequestUnread value1,
        string value2
    ) => !value1.Value.Equals(value2);

    public static explicit operator string(ListConversationsInboxMessagesRequestUnread value) =>
        value.Value;

    public static explicit operator ListConversationsInboxMessagesRequestUnread(string value) =>
        new(value);

    internal class ListConversationsInboxMessagesRequestUnreadSerializer
        : JsonConverter<ListConversationsInboxMessagesRequestUnread>
    {
        public override ListConversationsInboxMessagesRequestUnread Read(
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
            return new ListConversationsInboxMessagesRequestUnread(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ListConversationsInboxMessagesRequestUnread value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ListConversationsInboxMessagesRequestUnread ReadAsPropertyName(
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
            return new ListConversationsInboxMessagesRequestUnread(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ListConversationsInboxMessagesRequestUnread value,
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
        public const string True = "true";

        public const string False = "false";
    }
}
