using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(CommentProblem.CommentProblemSerializer))]
[Serializable]
public readonly record struct CommentProblem : IStringEnum
{
    public static readonly CommentProblem Text = new(Values.Text);

    public static readonly CommentProblem Name = new(Values.Name);

    public static readonly CommentProblem Parent = new(Values.Parent);

    public static readonly CommentProblem Anchor = new(Values.Anchor);

    public static readonly CommentProblem Selection = new(Values.Selection);

    public CommentProblem(string value)
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
    public static CommentProblem FromCustom(string value)
    {
        return new CommentProblem(value);
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

    public static bool operator ==(CommentProblem value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CommentProblem value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CommentProblem value) => value.Value;

    public static explicit operator CommentProblem(string value) => new(value);

    internal class CommentProblemSerializer : JsonConverter<CommentProblem>
    {
        public override CommentProblem Read(
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
            return new CommentProblem(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CommentProblem value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CommentProblem ReadAsPropertyName(
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
            return new CommentProblem(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CommentProblem value,
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
        public const string Text = "text";

        public const string Name = "name";

        public const string Parent = "parent";

        public const string Anchor = "anchor";

        public const string Selection = "selection";
    }
}
