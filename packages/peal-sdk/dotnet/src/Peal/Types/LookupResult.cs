// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LookupResult.JsonConverter))]
[Serializable]
public record LookupResult
{
    internal LookupResult(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of LookupResult with <see cref="LookupResult.YoutubeVideoCategories"/>.
    /// </summary>
    public LookupResult(LookupResult.YoutubeVideoCategories value)
    {
        Type = "youtubeVideoCategories";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of LookupResult with <see cref="LookupResult.YoutubePlaylists"/>.
    /// </summary>
    public LookupResult(LookupResult.YoutubePlaylists value)
    {
        Type = "youtubePlaylists";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of LookupResult with <see cref="LookupResult.TiktokCreator"/>.
    /// </summary>
    public LookupResult(LookupResult.TiktokCreator value)
    {
        Type = "tiktokCreator";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of LookupResult with <see cref="LookupResult.PinterestBoards"/>.
    /// </summary>
    public LookupResult(LookupResult.PinterestBoards value)
    {
        Type = "pinterestBoards";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of LookupResult with <see cref="LookupResult.PinterestBoardSections"/>.
    /// </summary>
    public LookupResult(LookupResult.PinterestBoardSections value)
    {
        Type = "pinterestBoardSections";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of LookupResult with <see cref="LookupResult.LinkedinOrganizations"/>.
    /// </summary>
    public LookupResult(LookupResult.LinkedinOrganizations value)
    {
        Type = "linkedinOrganizations";
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
    /// Returns true if <see cref="Type"/> is "youtubeVideoCategories"
    /// </summary>
    public bool IsYoutubeVideoCategories => Type == "youtubeVideoCategories";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "youtubePlaylists"
    /// </summary>
    public bool IsYoutubePlaylists => Type == "youtubePlaylists";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "tiktokCreator"
    /// </summary>
    public bool IsTiktokCreator => Type == "tiktokCreator";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "pinterestBoards"
    /// </summary>
    public bool IsPinterestBoards => Type == "pinterestBoards";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "pinterestBoardSections"
    /// </summary>
    public bool IsPinterestBoardSections => Type == "pinterestBoardSections";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "linkedinOrganizations"
    /// </summary>
    public bool IsLinkedinOrganizations => Type == "linkedinOrganizations";

    /// <summary>
    /// Returns the value as a <see cref="Peal.LookupResultYoutubeVideoCategories"/> if <see cref="Type"/> is 'youtubeVideoCategories', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'youtubeVideoCategories'.</exception>
    public Peal.LookupResultYoutubeVideoCategories AsYoutubeVideoCategories() =>
        IsYoutubeVideoCategories
            ? (Peal.LookupResultYoutubeVideoCategories)Value!
            : throw new global::System.Exception(
                "LookupResult.Type is not 'youtubeVideoCategories'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.LookupResultYoutubePlaylists"/> if <see cref="Type"/> is 'youtubePlaylists', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'youtubePlaylists'.</exception>
    public Peal.LookupResultYoutubePlaylists AsYoutubePlaylists() =>
        IsYoutubePlaylists
            ? (Peal.LookupResultYoutubePlaylists)Value!
            : throw new global::System.Exception("LookupResult.Type is not 'youtubePlaylists'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.LookupResultTiktokCreator"/> if <see cref="Type"/> is 'tiktokCreator', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'tiktokCreator'.</exception>
    public Peal.LookupResultTiktokCreator AsTiktokCreator() =>
        IsTiktokCreator
            ? (Peal.LookupResultTiktokCreator)Value!
            : throw new global::System.Exception("LookupResult.Type is not 'tiktokCreator'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.LookupResultPinterestBoards"/> if <see cref="Type"/> is 'pinterestBoards', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'pinterestBoards'.</exception>
    public Peal.LookupResultPinterestBoards AsPinterestBoards() =>
        IsPinterestBoards
            ? (Peal.LookupResultPinterestBoards)Value!
            : throw new global::System.Exception("LookupResult.Type is not 'pinterestBoards'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.LookupResultPinterestBoardSections"/> if <see cref="Type"/> is 'pinterestBoardSections', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'pinterestBoardSections'.</exception>
    public Peal.LookupResultPinterestBoardSections AsPinterestBoardSections() =>
        IsPinterestBoardSections
            ? (Peal.LookupResultPinterestBoardSections)Value!
            : throw new global::System.Exception(
                "LookupResult.Type is not 'pinterestBoardSections'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.LookupResultLinkedinOrganizations"/> if <see cref="Type"/> is 'linkedinOrganizations', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'linkedinOrganizations'.</exception>
    public Peal.LookupResultLinkedinOrganizations AsLinkedinOrganizations() =>
        IsLinkedinOrganizations
            ? (Peal.LookupResultLinkedinOrganizations)Value!
            : throw new global::System.Exception(
                "LookupResult.Type is not 'linkedinOrganizations'"
            );

    public T Match<T>(
        Func<Peal.LookupResultYoutubeVideoCategories, T> onYoutubeVideoCategories,
        Func<Peal.LookupResultYoutubePlaylists, T> onYoutubePlaylists,
        Func<Peal.LookupResultTiktokCreator, T> onTiktokCreator,
        Func<Peal.LookupResultPinterestBoards, T> onPinterestBoards,
        Func<Peal.LookupResultPinterestBoardSections, T> onPinterestBoardSections,
        Func<Peal.LookupResultLinkedinOrganizations, T> onLinkedinOrganizations,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "youtubeVideoCategories" => onYoutubeVideoCategories(AsYoutubeVideoCategories()),
            "youtubePlaylists" => onYoutubePlaylists(AsYoutubePlaylists()),
            "tiktokCreator" => onTiktokCreator(AsTiktokCreator()),
            "pinterestBoards" => onPinterestBoards(AsPinterestBoards()),
            "pinterestBoardSections" => onPinterestBoardSections(AsPinterestBoardSections()),
            "linkedinOrganizations" => onLinkedinOrganizations(AsLinkedinOrganizations()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.LookupResultYoutubeVideoCategories> onYoutubeVideoCategories,
        Action<Peal.LookupResultYoutubePlaylists> onYoutubePlaylists,
        Action<Peal.LookupResultTiktokCreator> onTiktokCreator,
        Action<Peal.LookupResultPinterestBoards> onPinterestBoards,
        Action<Peal.LookupResultPinterestBoardSections> onPinterestBoardSections,
        Action<Peal.LookupResultLinkedinOrganizations> onLinkedinOrganizations,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "youtubeVideoCategories":
                onYoutubeVideoCategories(AsYoutubeVideoCategories());
                break;
            case "youtubePlaylists":
                onYoutubePlaylists(AsYoutubePlaylists());
                break;
            case "tiktokCreator":
                onTiktokCreator(AsTiktokCreator());
                break;
            case "pinterestBoards":
                onPinterestBoards(AsPinterestBoards());
                break;
            case "pinterestBoardSections":
                onPinterestBoardSections(AsPinterestBoardSections());
                break;
            case "linkedinOrganizations":
                onLinkedinOrganizations(AsLinkedinOrganizations());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LookupResultYoutubeVideoCategories"/> and returns true if successful.
    /// </summary>
    public bool TryAsYoutubeVideoCategories(out Peal.LookupResultYoutubeVideoCategories? value)
    {
        if (Type == "youtubeVideoCategories")
        {
            value = (Peal.LookupResultYoutubeVideoCategories)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LookupResultYoutubePlaylists"/> and returns true if successful.
    /// </summary>
    public bool TryAsYoutubePlaylists(out Peal.LookupResultYoutubePlaylists? value)
    {
        if (Type == "youtubePlaylists")
        {
            value = (Peal.LookupResultYoutubePlaylists)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LookupResultTiktokCreator"/> and returns true if successful.
    /// </summary>
    public bool TryAsTiktokCreator(out Peal.LookupResultTiktokCreator? value)
    {
        if (Type == "tiktokCreator")
        {
            value = (Peal.LookupResultTiktokCreator)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LookupResultPinterestBoards"/> and returns true if successful.
    /// </summary>
    public bool TryAsPinterestBoards(out Peal.LookupResultPinterestBoards? value)
    {
        if (Type == "pinterestBoards")
        {
            value = (Peal.LookupResultPinterestBoards)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LookupResultPinterestBoardSections"/> and returns true if successful.
    /// </summary>
    public bool TryAsPinterestBoardSections(out Peal.LookupResultPinterestBoardSections? value)
    {
        if (Type == "pinterestBoardSections")
        {
            value = (Peal.LookupResultPinterestBoardSections)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.LookupResultLinkedinOrganizations"/> and returns true if successful.
    /// </summary>
    public bool TryAsLinkedinOrganizations(out Peal.LookupResultLinkedinOrganizations? value)
    {
        if (Type == "linkedinOrganizations")
        {
            value = (Peal.LookupResultLinkedinOrganizations)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator LookupResult(LookupResult.YoutubeVideoCategories value) =>
        new(value);

    public static implicit operator LookupResult(LookupResult.YoutubePlaylists value) => new(value);

    public static implicit operator LookupResult(LookupResult.TiktokCreator value) => new(value);

    public static implicit operator LookupResult(LookupResult.PinterestBoards value) => new(value);

    public static implicit operator LookupResult(LookupResult.PinterestBoardSections value) =>
        new(value);

    public static implicit operator LookupResult(LookupResult.LinkedinOrganizations value) =>
        new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<LookupResult>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(LookupResult).IsAssignableFrom(typeToConvert);

        public override LookupResult Read(
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
                "youtubeVideoCategories" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.LookupResultYoutubeVideoCategories?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.LookupResultYoutubeVideoCategories"
                        ),
                "youtubePlaylists" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.LookupResultYoutubePlaylists?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.LookupResultYoutubePlaylists"
                        ),
                "tiktokCreator" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.LookupResultTiktokCreator?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.LookupResultTiktokCreator"
                        ),
                "pinterestBoards" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.LookupResultPinterestBoards?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.LookupResultPinterestBoards"
                        ),
                "pinterestBoardSections" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.LookupResultPinterestBoardSections?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.LookupResultPinterestBoardSections"
                        ),
                "linkedinOrganizations" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.LookupResultLinkedinOrganizations?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.LookupResultLinkedinOrganizations"
                        ),
                _ => json.Deserialize<object?>(options),
            };
            return new LookupResult(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LookupResult value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "youtubeVideoCategories" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "youtubePlaylists" => JsonSerializer.SerializeToNode(value.Value, options),
                    "tiktokCreator" => JsonSerializer.SerializeToNode(value.Value, options),
                    "pinterestBoards" => JsonSerializer.SerializeToNode(value.Value, options),
                    "pinterestBoardSections" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "linkedinOrganizations" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override LookupResult ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new LookupResult(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LookupResult value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for youtubeVideoCategories
    /// </summary>
    [Serializable]
    public struct YoutubeVideoCategories
    {
        public YoutubeVideoCategories(Peal.LookupResultYoutubeVideoCategories value)
        {
            Value = value;
        }

        internal Peal.LookupResultYoutubeVideoCategories Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator LookupResult.YoutubeVideoCategories(
            Peal.LookupResultYoutubeVideoCategories value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for youtubePlaylists
    /// </summary>
    [Serializable]
    public struct YoutubePlaylists
    {
        public YoutubePlaylists(Peal.LookupResultYoutubePlaylists value)
        {
            Value = value;
        }

        internal Peal.LookupResultYoutubePlaylists Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator LookupResult.YoutubePlaylists(
            Peal.LookupResultYoutubePlaylists value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for tiktokCreator
    /// </summary>
    [Serializable]
    public struct TiktokCreator
    {
        public TiktokCreator(Peal.LookupResultTiktokCreator value)
        {
            Value = value;
        }

        internal Peal.LookupResultTiktokCreator Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator LookupResult.TiktokCreator(
            Peal.LookupResultTiktokCreator value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for pinterestBoards
    /// </summary>
    [Serializable]
    public struct PinterestBoards
    {
        public PinterestBoards(Peal.LookupResultPinterestBoards value)
        {
            Value = value;
        }

        internal Peal.LookupResultPinterestBoards Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator LookupResult.PinterestBoards(
            Peal.LookupResultPinterestBoards value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for pinterestBoardSections
    /// </summary>
    [Serializable]
    public struct PinterestBoardSections
    {
        public PinterestBoardSections(Peal.LookupResultPinterestBoardSections value)
        {
            Value = value;
        }

        internal Peal.LookupResultPinterestBoardSections Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator LookupResult.PinterestBoardSections(
            Peal.LookupResultPinterestBoardSections value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for linkedinOrganizations
    /// </summary>
    [Serializable]
    public struct LinkedinOrganizations
    {
        public LinkedinOrganizations(Peal.LookupResultLinkedinOrganizations value)
        {
            Value = value;
        }

        internal Peal.LookupResultLinkedinOrganizations Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator LookupResult.LinkedinOrganizations(
            Peal.LookupResultLinkedinOrganizations value
        ) => new(value);
    }
}
