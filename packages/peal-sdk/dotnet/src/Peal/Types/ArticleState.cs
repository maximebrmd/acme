// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ArticleState.JsonConverter))]
[Serializable]
public record ArticleState
{
    internal ArticleState(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of ArticleState with <see cref="ArticleState.Draft"/>.
    /// </summary>
    public ArticleState(ArticleState.Draft value)
    {
        Type = "draft";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleState with <see cref="ArticleState.Scheduled"/>.
    /// </summary>
    public ArticleState(ArticleState.Scheduled value)
    {
        Type = "scheduled";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleState with <see cref="ArticleState.Publishing"/>.
    /// </summary>
    public ArticleState(ArticleState.Publishing value)
    {
        Type = "publishing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleState with <see cref="ArticleState.Published"/>.
    /// </summary>
    public ArticleState(ArticleState.Published value)
    {
        Type = "published";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleState with <see cref="ArticleState.Failed"/>.
    /// </summary>
    public ArticleState(ArticleState.Failed value)
    {
        Type = "failed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of ArticleState with <see cref="ArticleState.Unconfirmed"/>.
    /// </summary>
    public ArticleState(ArticleState.Unconfirmed value)
    {
        Type = "unconfirmed";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("_tag")]
    public string Type { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Type"/> is "draft"
    /// </summary>
    public bool IsDraft => Type == "draft";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "scheduled"
    /// </summary>
    public bool IsScheduled => Type == "scheduled";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "publishing"
    /// </summary>
    public bool IsPublishing => Type == "publishing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "published"
    /// </summary>
    public bool IsPublished => Type == "published";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "failed"
    /// </summary>
    public bool IsFailed => Type == "failed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "unconfirmed"
    /// </summary>
    public bool IsUnconfirmed => Type == "unconfirmed";

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleStateDraft"/> if <see cref="Type"/> is 'draft', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'draft'.</exception>
    public Peal.ArticleStateDraft AsDraft() =>
        IsDraft
            ? (Peal.ArticleStateDraft)Value!
            : throw new global::System.Exception("ArticleState.Type is not 'draft'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleStateScheduled"/> if <see cref="Type"/> is 'scheduled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'scheduled'.</exception>
    public Peal.ArticleStateScheduled AsScheduled() =>
        IsScheduled
            ? (Peal.ArticleStateScheduled)Value!
            : throw new global::System.Exception("ArticleState.Type is not 'scheduled'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleStatePublishing"/> if <see cref="Type"/> is 'publishing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'publishing'.</exception>
    public Peal.ArticleStatePublishing AsPublishing() =>
        IsPublishing
            ? (Peal.ArticleStatePublishing)Value!
            : throw new global::System.Exception("ArticleState.Type is not 'publishing'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleStatePublished"/> if <see cref="Type"/> is 'published', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'published'.</exception>
    public Peal.ArticleStatePublished AsPublished() =>
        IsPublished
            ? (Peal.ArticleStatePublished)Value!
            : throw new global::System.Exception("ArticleState.Type is not 'published'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleStateFailed"/> if <see cref="Type"/> is 'failed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'failed'.</exception>
    public Peal.ArticleStateFailed AsFailed() =>
        IsFailed
            ? (Peal.ArticleStateFailed)Value!
            : throw new global::System.Exception("ArticleState.Type is not 'failed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.ArticleStateUnconfirmed"/> if <see cref="Type"/> is 'unconfirmed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'unconfirmed'.</exception>
    public Peal.ArticleStateUnconfirmed AsUnconfirmed() =>
        IsUnconfirmed
            ? (Peal.ArticleStateUnconfirmed)Value!
            : throw new global::System.Exception("ArticleState.Type is not 'unconfirmed'");

    public T Match<T>(
        Func<Peal.ArticleStateDraft, T> onDraft,
        Func<Peal.ArticleStateScheduled, T> onScheduled,
        Func<Peal.ArticleStatePublishing, T> onPublishing,
        Func<Peal.ArticleStatePublished, T> onPublished,
        Func<Peal.ArticleStateFailed, T> onFailed,
        Func<Peal.ArticleStateUnconfirmed, T> onUnconfirmed,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "draft" => onDraft(AsDraft()),
            "scheduled" => onScheduled(AsScheduled()),
            "publishing" => onPublishing(AsPublishing()),
            "published" => onPublished(AsPublished()),
            "failed" => onFailed(AsFailed()),
            "unconfirmed" => onUnconfirmed(AsUnconfirmed()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.ArticleStateDraft> onDraft,
        Action<Peal.ArticleStateScheduled> onScheduled,
        Action<Peal.ArticleStatePublishing> onPublishing,
        Action<Peal.ArticleStatePublished> onPublished,
        Action<Peal.ArticleStateFailed> onFailed,
        Action<Peal.ArticleStateUnconfirmed> onUnconfirmed,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "draft":
                onDraft(AsDraft());
                break;
            case "scheduled":
                onScheduled(AsScheduled());
                break;
            case "publishing":
                onPublishing(AsPublishing());
                break;
            case "published":
                onPublished(AsPublished());
                break;
            case "failed":
                onFailed(AsFailed());
                break;
            case "unconfirmed":
                onUnconfirmed(AsUnconfirmed());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleStateDraft"/> and returns true if successful.
    /// </summary>
    public bool TryAsDraft(out Peal.ArticleStateDraft? value)
    {
        if (Type == "draft")
        {
            value = (Peal.ArticleStateDraft)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleStateScheduled"/> and returns true if successful.
    /// </summary>
    public bool TryAsScheduled(out Peal.ArticleStateScheduled? value)
    {
        if (Type == "scheduled")
        {
            value = (Peal.ArticleStateScheduled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleStatePublishing"/> and returns true if successful.
    /// </summary>
    public bool TryAsPublishing(out Peal.ArticleStatePublishing? value)
    {
        if (Type == "publishing")
        {
            value = (Peal.ArticleStatePublishing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleStatePublished"/> and returns true if successful.
    /// </summary>
    public bool TryAsPublished(out Peal.ArticleStatePublished? value)
    {
        if (Type == "published")
        {
            value = (Peal.ArticleStatePublished)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleStateFailed"/> and returns true if successful.
    /// </summary>
    public bool TryAsFailed(out Peal.ArticleStateFailed? value)
    {
        if (Type == "failed")
        {
            value = (Peal.ArticleStateFailed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.ArticleStateUnconfirmed"/> and returns true if successful.
    /// </summary>
    public bool TryAsUnconfirmed(out Peal.ArticleStateUnconfirmed? value)
    {
        if (Type == "unconfirmed")
        {
            value = (Peal.ArticleStateUnconfirmed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator ArticleState(ArticleState.Draft value) => new(value);

    public static implicit operator ArticleState(ArticleState.Scheduled value) => new(value);

    public static implicit operator ArticleState(ArticleState.Publishing value) => new(value);

    public static implicit operator ArticleState(ArticleState.Published value) => new(value);

    public static implicit operator ArticleState(ArticleState.Failed value) => new(value);

    public static implicit operator ArticleState(ArticleState.Unconfirmed value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<ArticleState>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(ArticleState).IsAssignableFrom(typeToConvert);

        public override ArticleState Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("_tag", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property '_tag'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property '_tag' is null");
                }

                throw new JsonException(
                    $"Discriminator property '_tag' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property '_tag' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("_tag");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "draft" => jsonWithoutDiscriminator.Deserialize<Peal.ArticleStateDraft?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ArticleStateDraft"),
                "scheduled" => jsonWithoutDiscriminator.Deserialize<Peal.ArticleStateScheduled?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ArticleStateScheduled"),
                "publishing" => jsonWithoutDiscriminator.Deserialize<Peal.ArticleStatePublishing?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ArticleStatePublishing"),
                "published" => jsonWithoutDiscriminator.Deserialize<Peal.ArticleStatePublished?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.ArticleStatePublished"),
                "failed" => jsonWithoutDiscriminator.Deserialize<Peal.ArticleStateFailed?>(options)
                    ?? throw new JsonException("Failed to deserialize Peal.ArticleStateFailed"),
                "unconfirmed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.ArticleStateUnconfirmed?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.ArticleStateUnconfirmed"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new ArticleState(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ArticleState value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "draft" => JsonSerializer.SerializeToNode(value.Value, options),
                    "scheduled" => JsonSerializer.SerializeToNode(value.Value, options),
                    "publishing" => JsonSerializer.SerializeToNode(value.Value, options),
                    "published" => JsonSerializer.SerializeToNode(value.Value, options),
                    "failed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "unconfirmed" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override ArticleState ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new ArticleState(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ArticleState value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for draft
    /// </summary>
    [Serializable]
    public struct Draft
    {
        public Draft(Peal.ArticleStateDraft value)
        {
            Value = value;
        }

        internal Peal.ArticleStateDraft Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleState.Draft(Peal.ArticleStateDraft value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for scheduled
    /// </summary>
    [Serializable]
    public struct Scheduled
    {
        public Scheduled(Peal.ArticleStateScheduled value)
        {
            Value = value;
        }

        internal Peal.ArticleStateScheduled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleState.Scheduled(Peal.ArticleStateScheduled value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for publishing
    /// </summary>
    [Serializable]
    public struct Publishing
    {
        public Publishing(Peal.ArticleStatePublishing value)
        {
            Value = value;
        }

        internal Peal.ArticleStatePublishing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleState.Publishing(
            Peal.ArticleStatePublishing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for published
    /// </summary>
    [Serializable]
    public struct Published
    {
        public Published(Peal.ArticleStatePublished value)
        {
            Value = value;
        }

        internal Peal.ArticleStatePublished Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleState.Published(Peal.ArticleStatePublished value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for failed
    /// </summary>
    [Serializable]
    public struct Failed
    {
        public Failed(Peal.ArticleStateFailed value)
        {
            Value = value;
        }

        internal Peal.ArticleStateFailed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleState.Failed(Peal.ArticleStateFailed value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for unconfirmed
    /// </summary>
    [Serializable]
    public struct Unconfirmed
    {
        public Unconfirmed(Peal.ArticleStateUnconfirmed value)
        {
            Value = value;
        }

        internal Peal.ArticleStateUnconfirmed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator ArticleState.Unconfirmed(
            Peal.ArticleStateUnconfirmed value
        ) => new(value);
    }
}
