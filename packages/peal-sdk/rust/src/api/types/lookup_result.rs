pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum LookupResult {
    #[serde(rename = "youtubeVideoCategories")]
    #[non_exhaustive]
    YoutubeVideoCategories {
        #[serde(default)]
        items: Vec<YouTubeVideoCategory>,
        #[serde(rename = "nextCursor")]
        #[serde(skip_serializing_if = "Option::is_none")]
        next_cursor: Option<String>,
    },

    #[serde(rename = "youtubePlaylists")]
    #[non_exhaustive]
    YoutubePlaylists {
        #[serde(default)]
        items: Vec<YouTubePlaylist>,
        #[serde(rename = "nextCursor")]
        #[serde(skip_serializing_if = "Option::is_none")]
        next_cursor: Option<String>,
    },

    #[serde(rename = "tiktokCreator")]
    #[non_exhaustive]
    TiktokCreator {
        #[serde(default)]
        items: Vec<TikTokAccount>,
        #[serde(rename = "nextCursor")]
        #[serde(skip_serializing_if = "Option::is_none")]
        next_cursor: Option<String>,
    },

    #[serde(rename = "linkedinOrganizations")]
    #[non_exhaustive]
    LinkedinOrganizations {
        #[serde(default)]
        items: Vec<LinkedInOrganization>,
        #[serde(rename = "nextCursor")]
        #[serde(skip_serializing_if = "Option::is_none")]
        next_cursor: Option<String>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl LookupResult {
    pub fn youtube_video_categories(items: Vec<YouTubeVideoCategory>) -> Self {
        Self::YoutubeVideoCategories {
            items,
            next_cursor: None,
        }
    }

    pub fn youtube_playlists(items: Vec<YouTubePlaylist>) -> Self {
        Self::YoutubePlaylists {
            items,
            next_cursor: None,
        }
    }

    pub fn tiktok_creator(items: Vec<TikTokAccount>) -> Self {
        Self::TiktokCreator {
            items,
            next_cursor: None,
        }
    }

    pub fn linkedin_organizations(items: Vec<LinkedInOrganization>) -> Self {
        Self::LinkedinOrganizations {
            items,
            next_cursor: None,
        }
    }

    pub fn youtube_video_categories_with_next_cursor(
        items: Vec<YouTubeVideoCategory>,
        next_cursor: String,
    ) -> Self {
        Self::YoutubeVideoCategories {
            items,
            next_cursor: Some(next_cursor),
        }
    }

    pub fn youtube_playlists_with_next_cursor(
        items: Vec<YouTubePlaylist>,
        next_cursor: String,
    ) -> Self {
        Self::YoutubePlaylists {
            items,
            next_cursor: Some(next_cursor),
        }
    }

    pub fn tiktok_creator_with_next_cursor(items: Vec<TikTokAccount>, next_cursor: String) -> Self {
        Self::TiktokCreator {
            items,
            next_cursor: Some(next_cursor),
        }
    }

    pub fn linkedin_organizations_with_next_cursor(
        items: Vec<LinkedInOrganization>,
        next_cursor: String,
    ) -> Self {
        Self::LinkedinOrganizations {
            items,
            next_cursor: Some(next_cursor),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
