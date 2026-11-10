using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LookupName.LookupNameSerializer))]
[Serializable]
public readonly record struct LookupName : IStringEnum
{
    public static readonly LookupName YoutubeVideoCategories = new(Values.YoutubeVideoCategories);

    public static readonly LookupName YoutubePlaylists = new(Values.YoutubePlaylists);

    public static readonly LookupName TiktokCreator = new(Values.TiktokCreator);

    public static readonly LookupName PinterestBoards = new(Values.PinterestBoards);

    public static readonly LookupName PinterestBoardSections = new(Values.PinterestBoardSections);

    public static readonly LookupName LinkedinOrganizations = new(Values.LinkedinOrganizations);

    public LookupName(string value)
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
    public static LookupName FromCustom(string value)
    {
        return new LookupName(value);
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

    public static bool operator ==(LookupName value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(LookupName value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LookupName value) => value.Value;

    public static explicit operator LookupName(string value) => new(value);

    internal class LookupNameSerializer : JsonConverter<LookupName>
    {
        public override LookupName Read(
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
            return new LookupName(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LookupName value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LookupName ReadAsPropertyName(
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
            return new LookupName(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LookupName value,
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
        public const string YoutubeVideoCategories = "youtubeVideoCategories";

        public const string YoutubePlaylists = "youtubePlaylists";

        public const string TiktokCreator = "tiktokCreator";

        public const string PinterestBoards = "pinterestBoards";

        public const string PinterestBoardSections = "pinterestBoardSections";

        public const string LinkedinOrganizations = "linkedinOrganizations";
    }
}
