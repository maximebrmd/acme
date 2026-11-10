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

    #[serde(rename = "googleBusiness")]
    #[non_exhaustive]
    GoogleBusiness {
        #[serde(rename = "callToAction")]
        #[serde(skip_serializing_if = "Option::is_none")]
        call_to_action: Option<GoogleBusinessCallToAction>,
        #[serde(rename = "callToActionUrl")]
        #[serde(skip_serializing_if = "Option::is_none")]
        call_to_action_url: Option<String>,
        #[serde(rename = "couponCode")]
        #[serde(skip_serializing_if = "Option::is_none")]
        coupon_code: Option<String>,
        #[serde(rename = "endsAt")]
        #[serde(skip_serializing_if = "Option::is_none")]
        ends_at: Option<String>,
        #[serde(rename = "postType")]
        #[serde(skip_serializing_if = "Option::is_none")]
        post_type: Option<GoogleBusinessPostType>,
        #[serde(rename = "redeemUrl")]
        #[serde(skip_serializing_if = "Option::is_none")]
        redeem_url: Option<String>,
        #[serde(rename = "startsAt")]
        #[serde(skip_serializing_if = "Option::is_none")]
        starts_at: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        terms: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
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

    pub fn google_business() -> Self {
        Self::GoogleBusiness {
            call_to_action: None,
            call_to_action_url: None,
            coupon_code: None,
            ends_at: None,
            post_type: None,
            redeem_url: None,
            starts_at: None,
            terms: None,
            title: None,
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

    pub fn google_business_with_call_to_action(
        call_to_action: GoogleBusinessCallToAction,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action: Some(call_to_action),
            call_to_action_url,
            coupon_code,
            ends_at,
            post_type,
            redeem_url,
            starts_at,
            terms,
            title,
        }
    }

    pub fn google_business_with_call_to_action_url(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: String,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url: Some(call_to_action_url),
            coupon_code,
            ends_at,
            post_type,
            redeem_url,
            starts_at,
            terms,
            title,
        }
    }

    pub fn google_business_with_coupon_code(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: String,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code: Some(coupon_code),
            ends_at,
            post_type,
            redeem_url,
            starts_at,
            terms,
            title,
        }
    }

    pub fn google_business_with_ends_at(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: String,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code,
            ends_at: Some(ends_at),
            post_type,
            redeem_url,
            starts_at,
            terms,
            title,
        }
    }

    pub fn google_business_with_post_type(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: GoogleBusinessPostType,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code,
            ends_at,
            post_type: Some(post_type),
            redeem_url,
            starts_at,
            terms,
            title,
        }
    }

    pub fn google_business_with_redeem_url(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: String,
        starts_at: Option<String>,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code,
            ends_at,
            post_type,
            redeem_url: Some(redeem_url),
            starts_at,
            terms,
            title,
        }
    }

    pub fn google_business_with_starts_at(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: String,
        terms: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code,
            ends_at,
            post_type,
            redeem_url,
            starts_at: Some(starts_at),
            terms,
            title,
        }
    }

    pub fn google_business_with_terms(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: String,
        title: Option<String>,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code,
            ends_at,
            post_type,
            redeem_url,
            starts_at,
            terms: Some(terms),
            title,
        }
    }

    pub fn google_business_with_title(
        call_to_action: Option<GoogleBusinessCallToAction>,
        call_to_action_url: Option<String>,
        coupon_code: Option<String>,
        ends_at: Option<String>,
        post_type: Option<GoogleBusinessPostType>,
        redeem_url: Option<String>,
        starts_at: Option<String>,
        terms: Option<String>,
        title: String,
    ) -> Self {
        Self::GoogleBusiness {
            call_to_action,
            call_to_action_url,
            coupon_code,
            ends_at,
            post_type,
            redeem_url,
            starts_at,
            terms,
            title: Some(title),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
