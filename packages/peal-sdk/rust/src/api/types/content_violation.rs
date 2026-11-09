pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ContentViolation {
    #[serde(rename = "noChannels")]
    #[non_exhaustive]
    NoChannels {},

    #[serde(rename = "overrideWithoutChannel")]
    #[non_exhaustive]
    OverrideWithoutChannel {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
    },

    #[serde(rename = "optionsWithoutChannel")]
    #[non_exhaustive]
    OptionsWithoutChannel {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
    },

    #[serde(rename = "optionsForOtherPlatform")]
    #[non_exhaustive]
    OptionsForOtherPlatform {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "optionsPlatform")]
        options_platform: Platform,
    },

    #[serde(rename = "optionMissing")]
    #[non_exhaustive]
    OptionMissing {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        field: String,
    },

    #[serde(rename = "optionTooLong")]
    #[non_exhaustive]
    OptionTooLong {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        field: String,
        #[serde(default)]
        length: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "optionInvalid")]
    #[non_exhaustive]
    OptionInvalid {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        field: String,
    },

    #[serde(rename = "empty")]
    #[non_exhaustive]
    Empty {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
    },

    #[serde(rename = "textTooLong")]
    #[non_exhaustive]
    TextTooLong {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        length: i64,
        #[serde(default)]
        maximum: i64,
        unit: TextUnit,
    },

    #[serde(rename = "forbiddenCharacters")]
    #[non_exhaustive]
    ForbiddenCharacters {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        characters: Vec<String>,
    },

    #[serde(rename = "tooManyMedia")]
    #[non_exhaustive]
    TooManyMedia {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        count: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "mediaRequired")]
    #[non_exhaustive]
    MediaRequired {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
    },

    #[serde(rename = "tooManyHashtags")]
    #[non_exhaustive]
    TooManyHashtags {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        count: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "tooManyMentions")]
    #[non_exhaustive]
    TooManyMentions {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        count: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "tooManyLinks")]
    #[non_exhaustive]
    TooManyLinks {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        count: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "tooManyVideos")]
    #[non_exhaustive]
    TooManyVideos {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(default)]
        count: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "mixedMedia")]
    #[non_exhaustive]
    MixedMedia {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
    },

    #[serde(rename = "mediaTypeUnsupported")]
    #[non_exhaustive]
    MediaTypeUnsupported {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(rename = "contentType")]
        content_type: MediaContentType,
    },

    #[serde(rename = "mediaTooLarge")]
    #[non_exhaustive]
    MediaTooLarge {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(rename = "byteSize")]
        #[serde(default)]
        byte_size: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "mediaTooSmall")]
    #[non_exhaustive]
    MediaTooSmall {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(rename = "byteSize")]
        #[serde(default)]
        byte_size: i64,
        #[serde(default)]
        minimum: i64,
    },

    #[serde(rename = "videoTooLong")]
    #[non_exhaustive]
    VideoTooLong {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(rename = "durationMs")]
        #[serde(default)]
        duration_ms: i64,
        #[serde(rename = "maximumMs")]
        #[serde(default)]
        maximum_ms: i64,
    },

    #[serde(rename = "videoTooShort")]
    #[non_exhaustive]
    VideoTooShort {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(rename = "durationMs")]
        #[serde(default)]
        duration_ms: i64,
        #[serde(rename = "minimumMs")]
        #[serde(default)]
        minimum_ms: i64,
    },

    #[serde(rename = "tooManyPixels")]
    #[non_exhaustive]
    TooManyPixels {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(default)]
        height: i64,
        #[serde(default)]
        width: i64,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "sideOutOfRange")]
    #[non_exhaustive]
    SideOutOfRange {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(default)]
        height: i64,
        #[serde(default)]
        width: i64,
        #[serde(default)]
        maximum: i64,
        #[serde(default)]
        minimum: i64,
    },

    #[serde(rename = "aspectRatioUnsupported")]
    #[non_exhaustive]
    AspectRatioUnsupported {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(default)]
        height: i64,
        #[serde(default)]
        width: i64,
        maximum: ContentViolationAspectRatioUnsupportedMaximum,
        minimum: ContentViolationAspectRatioUnsupportedMinimum,
    },

    #[serde(rename = "altTextTooLong")]
    #[non_exhaustive]
    AltTextTooLong {
        #[serde(rename = "channelId")]
        #[serde(default)]
        channel_id: String,
        platform: Platform,
        #[serde(rename = "mediaId")]
        #[serde(default)]
        media_id: String,
        #[serde(default)]
        length: i64,
        #[serde(default)]
        maximum: i64,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ContentViolation {
    pub fn no_channels() -> Self {
        Self::NoChannels {}
    }

    pub fn override_without_channel(channel_id: String) -> Self {
        Self::OverrideWithoutChannel { channel_id }
    }

    pub fn options_without_channel(channel_id: String) -> Self {
        Self::OptionsWithoutChannel { channel_id }
    }

    pub fn options_for_other_platform(
        channel_id: String,
        platform: Platform,
        options_platform: Platform,
    ) -> Self {
        Self::OptionsForOtherPlatform {
            channel_id,
            platform,
            options_platform,
        }
    }

    pub fn option_missing(channel_id: String, platform: Platform, field: String) -> Self {
        Self::OptionMissing {
            channel_id,
            platform,
            field,
        }
    }

    pub fn option_too_long(
        channel_id: String,
        platform: Platform,
        field: String,
        length: i64,
        maximum: i64,
    ) -> Self {
        Self::OptionTooLong {
            channel_id,
            platform,
            field,
            length,
            maximum,
        }
    }

    pub fn option_invalid(channel_id: String, platform: Platform, field: String) -> Self {
        Self::OptionInvalid {
            channel_id,
            platform,
            field,
        }
    }

    pub fn empty(channel_id: String, platform: Platform) -> Self {
        Self::Empty {
            channel_id,
            platform,
        }
    }

    pub fn text_too_long(
        channel_id: String,
        platform: Platform,
        length: i64,
        maximum: i64,
        unit: TextUnit,
    ) -> Self {
        Self::TextTooLong {
            channel_id,
            platform,
            length,
            maximum,
            unit,
        }
    }

    pub fn forbidden_characters(
        channel_id: String,
        platform: Platform,
        characters: Vec<String>,
    ) -> Self {
        Self::ForbiddenCharacters {
            channel_id,
            platform,
            characters,
        }
    }

    pub fn too_many_media(
        channel_id: String,
        platform: Platform,
        count: i64,
        maximum: i64,
    ) -> Self {
        Self::TooManyMedia {
            channel_id,
            platform,
            count,
            maximum,
        }
    }

    pub fn media_required(channel_id: String, platform: Platform) -> Self {
        Self::MediaRequired {
            channel_id,
            platform,
        }
    }

    pub fn too_many_hashtags(
        channel_id: String,
        platform: Platform,
        count: i64,
        maximum: i64,
    ) -> Self {
        Self::TooManyHashtags {
            channel_id,
            platform,
            count,
            maximum,
        }
    }

    pub fn too_many_mentions(
        channel_id: String,
        platform: Platform,
        count: i64,
        maximum: i64,
    ) -> Self {
        Self::TooManyMentions {
            channel_id,
            platform,
            count,
            maximum,
        }
    }

    pub fn too_many_links(
        channel_id: String,
        platform: Platform,
        count: i64,
        maximum: i64,
    ) -> Self {
        Self::TooManyLinks {
            channel_id,
            platform,
            count,
            maximum,
        }
    }

    pub fn too_many_videos(
        channel_id: String,
        platform: Platform,
        count: i64,
        maximum: i64,
    ) -> Self {
        Self::TooManyVideos {
            channel_id,
            platform,
            count,
            maximum,
        }
    }

    pub fn mixed_media(channel_id: String, platform: Platform) -> Self {
        Self::MixedMedia {
            channel_id,
            platform,
        }
    }

    pub fn media_type_unsupported(
        channel_id: String,
        platform: Platform,
        media_id: String,
        content_type: MediaContentType,
    ) -> Self {
        Self::MediaTypeUnsupported {
            channel_id,
            platform,
            media_id,
            content_type,
        }
    }

    pub fn media_too_large(
        channel_id: String,
        platform: Platform,
        media_id: String,
        byte_size: i64,
        maximum: i64,
    ) -> Self {
        Self::MediaTooLarge {
            channel_id,
            platform,
            media_id,
            byte_size,
            maximum,
        }
    }

    pub fn media_too_small(
        channel_id: String,
        platform: Platform,
        media_id: String,
        byte_size: i64,
        minimum: i64,
    ) -> Self {
        Self::MediaTooSmall {
            channel_id,
            platform,
            media_id,
            byte_size,
            minimum,
        }
    }

    pub fn video_too_long(
        channel_id: String,
        platform: Platform,
        media_id: String,
        duration_ms: i64,
        maximum_ms: i64,
    ) -> Self {
        Self::VideoTooLong {
            channel_id,
            platform,
            media_id,
            duration_ms,
            maximum_ms,
        }
    }

    pub fn video_too_short(
        channel_id: String,
        platform: Platform,
        media_id: String,
        duration_ms: i64,
        minimum_ms: i64,
    ) -> Self {
        Self::VideoTooShort {
            channel_id,
            platform,
            media_id,
            duration_ms,
            minimum_ms,
        }
    }

    pub fn too_many_pixels(
        channel_id: String,
        platform: Platform,
        media_id: String,
        height: i64,
        width: i64,
        maximum: i64,
    ) -> Self {
        Self::TooManyPixels {
            channel_id,
            platform,
            media_id,
            height,
            width,
            maximum,
        }
    }

    pub fn side_out_of_range(
        channel_id: String,
        platform: Platform,
        media_id: String,
        height: i64,
        width: i64,
        maximum: i64,
        minimum: i64,
    ) -> Self {
        Self::SideOutOfRange {
            channel_id,
            platform,
            media_id,
            height,
            width,
            maximum,
            minimum,
        }
    }

    pub fn aspect_ratio_unsupported(
        channel_id: String,
        platform: Platform,
        media_id: String,
        height: i64,
        width: i64,
        maximum: ContentViolationAspectRatioUnsupportedMaximum,
        minimum: ContentViolationAspectRatioUnsupportedMinimum,
    ) -> Self {
        Self::AspectRatioUnsupported {
            channel_id,
            platform,
            media_id,
            height,
            width,
            maximum,
            minimum,
        }
    }

    pub fn alt_text_too_long(
        channel_id: String,
        platform: Platform,
        media_id: String,
        length: i64,
        maximum: i64,
    ) -> Self {
        Self::AltTextTooLong {
            channel_id,
            platform,
            media_id,
            length,
            maximum,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
