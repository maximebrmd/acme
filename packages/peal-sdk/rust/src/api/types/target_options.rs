pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "platform")]
#[non_exhaustive]
pub enum TargetOptions {
    #[serde(rename = "youtube")]
    #[non_exhaustive]
    Youtube {
        #[serde(rename = "categoryId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        category_id: Option<String>,
        #[serde(rename = "containsSyntheticMedia")]
        #[serde(skip_serializing_if = "Option::is_none")]
        contains_synthetic_media: Option<bool>,
        #[serde(rename = "madeForKids")]
        #[serde(skip_serializing_if = "Option::is_none")]
        made_for_kids: Option<bool>,
        #[serde(rename = "notifySubscribers")]
        #[serde(skip_serializing_if = "Option::is_none")]
        notify_subscribers: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        privacy: Option<YouTubePrivacy>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tags: Option<Vec<String>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
    },

    #[serde(rename = "tiktok")]
    #[non_exhaustive]
    Tiktok {
        #[serde(rename = "aiGenerated")]
        #[serde(skip_serializing_if = "Option::is_none")]
        ai_generated: Option<bool>,
        #[serde(rename = "brandContent")]
        #[serde(skip_serializing_if = "Option::is_none")]
        brand_content: Option<bool>,
        #[serde(rename = "brandOrganic")]
        #[serde(skip_serializing_if = "Option::is_none")]
        brand_organic: Option<bool>,
        #[serde(rename = "commercialContent")]
        #[serde(skip_serializing_if = "Option::is_none")]
        commercial_content: Option<bool>,
        #[serde(rename = "disableComment")]
        #[serde(skip_serializing_if = "Option::is_none")]
        disable_comment: Option<bool>,
        #[serde(rename = "disableDuet")]
        #[serde(skip_serializing_if = "Option::is_none")]
        disable_duet: Option<bool>,
        #[serde(rename = "disableStitch")]
        #[serde(skip_serializing_if = "Option::is_none")]
        disable_stitch: Option<bool>,
        #[serde(rename = "privacyLevel")]
        #[serde(skip_serializing_if = "Option::is_none")]
        privacy_level: Option<TikTokPrivacyLevel>,
    },

    #[serde(rename = "linkedin")]
    #[non_exhaustive]
    Linkedin {
        #[serde(rename = "disableReshare")]
        #[serde(skip_serializing_if = "Option::is_none")]
        disable_reshare: Option<bool>,
        #[serde(rename = "documentTitle")]
        #[serde(skip_serializing_if = "Option::is_none")]
        document_title: Option<String>,
        #[serde(rename = "linkDescription")]
        #[serde(skip_serializing_if = "Option::is_none")]
        link_description: Option<String>,
        #[serde(rename = "linkTitle")]
        #[serde(skip_serializing_if = "Option::is_none")]
        link_title: Option<String>,
        #[serde(rename = "linkUrl")]
        #[serde(skip_serializing_if = "Option::is_none")]
        link_url: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        mentions: Option<Vec<LinkedInMention>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        visibility: Option<LinkedInVisibility>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl TargetOptions {
    pub fn youtube() -> Self {
        Self::Youtube {
            category_id: None,
            contains_synthetic_media: None,
            made_for_kids: None,
            notify_subscribers: None,
            privacy: None,
            tags: None,
            title: None,
        }
    }

    pub fn tiktok() -> Self {
        Self::Tiktok {
            ai_generated: None,
            brand_content: None,
            brand_organic: None,
            commercial_content: None,
            disable_comment: None,
            disable_duet: None,
            disable_stitch: None,
            privacy_level: None,
        }
    }

    pub fn linkedin() -> Self {
        Self::Linkedin {
            disable_reshare: None,
            document_title: None,
            link_description: None,
            link_title: None,
            link_url: None,
            mentions: None,
            visibility: None,
        }
    }

    pub fn youtube_with_category_id(
        category_id: String,
        contains_synthetic_media: Option<bool>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        tags: Option<Vec<String>>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id: Some(category_id),
            contains_synthetic_media,
            made_for_kids,
            notify_subscribers,
            privacy,
            tags,
            title,
        }
    }

    pub fn youtube_with_contains_synthetic_media(
        category_id: Option<String>,
        contains_synthetic_media: bool,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        tags: Option<Vec<String>>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media: Some(contains_synthetic_media),
            made_for_kids,
            notify_subscribers,
            privacy,
            tags,
            title,
        }
    }

    pub fn youtube_with_made_for_kids(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        made_for_kids: bool,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        tags: Option<Vec<String>>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            made_for_kids: Some(made_for_kids),
            notify_subscribers,
            privacy,
            tags,
            title,
        }
    }

    pub fn youtube_with_notify_subscribers(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        made_for_kids: Option<bool>,
        notify_subscribers: bool,
        privacy: Option<YouTubePrivacy>,
        tags: Option<Vec<String>>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            made_for_kids,
            notify_subscribers: Some(notify_subscribers),
            privacy,
            tags,
            title,
        }
    }

    pub fn youtube_with_privacy(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: YouTubePrivacy,
        tags: Option<Vec<String>>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            made_for_kids,
            notify_subscribers,
            privacy: Some(privacy),
            tags,
            title,
        }
    }

    pub fn youtube_with_tags(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        tags: Vec<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            made_for_kids,
            notify_subscribers,
            privacy,
            tags: Some(tags),
            title,
        }
    }

    pub fn youtube_with_title(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        tags: Option<Vec<String>>,
        title: String,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            made_for_kids,
            notify_subscribers,
            privacy,
            tags,
            title: Some(title),
        }
    }

    pub fn tiktok_with_ai_generated(
        ai_generated: bool,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated: Some(ai_generated),
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            privacy_level,
        }
    }

    pub fn tiktok_with_brand_content(
        ai_generated: Option<bool>,
        brand_content: bool,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content: Some(brand_content),
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            privacy_level,
        }
    }

    pub fn tiktok_with_brand_organic(
        ai_generated: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: bool,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content,
            brand_organic: Some(brand_organic),
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            privacy_level,
        }
    }

    pub fn tiktok_with_commercial_content(
        ai_generated: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: bool,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content,
            brand_organic,
            commercial_content: Some(commercial_content),
            disable_comment,
            disable_duet,
            disable_stitch,
            privacy_level,
        }
    }

    pub fn tiktok_with_disable_comment(
        ai_generated: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: bool,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment: Some(disable_comment),
            disable_duet,
            disable_stitch,
            privacy_level,
        }
    }

    pub fn tiktok_with_disable_duet(
        ai_generated: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: bool,
        disable_stitch: Option<bool>,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet: Some(disable_duet),
            disable_stitch,
            privacy_level,
        }
    }

    pub fn tiktok_with_disable_stitch(
        ai_generated: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: bool,
        privacy_level: Option<TikTokPrivacyLevel>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch: Some(disable_stitch),
            privacy_level,
        }
    }

    pub fn tiktok_with_privacy_level(
        ai_generated: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        privacy_level: TikTokPrivacyLevel,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            privacy_level: Some(privacy_level),
        }
    }

    pub fn linkedin_with_disable_reshare(
        disable_reshare: bool,
        document_title: Option<String>,
        link_description: Option<String>,
        link_title: Option<String>,
        link_url: Option<String>,
        mentions: Option<Vec<LinkedInMention>>,
        visibility: Option<LinkedInVisibility>,
    ) -> Self {
        Self::Linkedin {
            disable_reshare: Some(disable_reshare),
            document_title,
            link_description,
            link_title,
            link_url,
            mentions,
            visibility,
        }
    }

    pub fn linkedin_with_document_title(
        disable_reshare: Option<bool>,
        document_title: String,
        link_description: Option<String>,
        link_title: Option<String>,
        link_url: Option<String>,
        mentions: Option<Vec<LinkedInMention>>,
        visibility: Option<LinkedInVisibility>,
    ) -> Self {
        Self::Linkedin {
            disable_reshare,
            document_title: Some(document_title),
            link_description,
            link_title,
            link_url,
            mentions,
            visibility,
        }
    }

    pub fn linkedin_with_link_description(
        disable_reshare: Option<bool>,
        document_title: Option<String>,
        link_description: String,
        link_title: Option<String>,
        link_url: Option<String>,
        mentions: Option<Vec<LinkedInMention>>,
        visibility: Option<LinkedInVisibility>,
    ) -> Self {
        Self::Linkedin {
            disable_reshare,
            document_title,
            link_description: Some(link_description),
            link_title,
            link_url,
            mentions,
            visibility,
        }
    }

    pub fn linkedin_with_link_title(
        disable_reshare: Option<bool>,
        document_title: Option<String>,
        link_description: Option<String>,
        link_title: String,
        link_url: Option<String>,
        mentions: Option<Vec<LinkedInMention>>,
        visibility: Option<LinkedInVisibility>,
    ) -> Self {
        Self::Linkedin {
            disable_reshare,
            document_title,
            link_description,
            link_title: Some(link_title),
            link_url,
            mentions,
            visibility,
        }
    }

    pub fn linkedin_with_link_url(
        disable_reshare: Option<bool>,
        document_title: Option<String>,
        link_description: Option<String>,
        link_title: Option<String>,
        link_url: String,
        mentions: Option<Vec<LinkedInMention>>,
        visibility: Option<LinkedInVisibility>,
    ) -> Self {
        Self::Linkedin {
            disable_reshare,
            document_title,
            link_description,
            link_title,
            link_url: Some(link_url),
            mentions,
            visibility,
        }
    }

    pub fn linkedin_with_mentions(
        disable_reshare: Option<bool>,
        document_title: Option<String>,
        link_description: Option<String>,
        link_title: Option<String>,
        link_url: Option<String>,
        mentions: Vec<LinkedInMention>,
        visibility: Option<LinkedInVisibility>,
    ) -> Self {
        Self::Linkedin {
            disable_reshare,
            document_title,
            link_description,
            link_title,
            link_url,
            mentions: Some(mentions),
            visibility,
        }
    }

    pub fn linkedin_with_visibility(
        disable_reshare: Option<bool>,
        document_title: Option<String>,
        link_description: Option<String>,
        link_title: Option<String>,
        link_url: Option<String>,
        mentions: Option<Vec<LinkedInMention>>,
        visibility: LinkedInVisibility,
    ) -> Self {
        Self::Linkedin {
            disable_reshare,
            document_title,
            link_description,
            link_title,
            link_url,
            mentions,
            visibility: Some(visibility),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
