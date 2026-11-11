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
        #[serde(rename = "defaultLanguage")]
        #[serde(skip_serializing_if = "Option::is_none")]
        default_language: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        embeddable: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        license: Option<YouTubeLicense>,
        #[serde(rename = "madeForKids")]
        #[serde(skip_serializing_if = "Option::is_none")]
        made_for_kids: Option<bool>,
        #[serde(rename = "notifySubscribers")]
        #[serde(skip_serializing_if = "Option::is_none")]
        notify_subscribers: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        privacy: Option<YouTubePrivacy>,
        #[serde(rename = "publicStatsViewable")]
        #[serde(skip_serializing_if = "Option::is_none")]
        public_stats_viewable: Option<bool>,
        #[serde(rename = "recordingDate")]
        #[serde(skip_serializing_if = "Option::is_none")]
        recording_date: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        tags: Option<Vec<String>>,
        #[serde(rename = "thumbnailMediaId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        thumbnail_media_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
    },

    #[serde(rename = "tiktok")]
    #[non_exhaustive]
    Tiktok {
        #[serde(rename = "aiGenerated")]
        #[serde(skip_serializing_if = "Option::is_none")]
        ai_generated: Option<bool>,
        #[serde(rename = "autoAddMusic")]
        #[serde(skip_serializing_if = "Option::is_none")]
        auto_add_music: Option<bool>,
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
        #[serde(rename = "photoCoverIndex")]
        #[serde(skip_serializing_if = "Option::is_none")]
        photo_cover_index: Option<i64>,
        #[serde(rename = "photoTitle")]
        #[serde(skip_serializing_if = "Option::is_none")]
        photo_title: Option<String>,
        #[serde(rename = "privacyLevel")]
        #[serde(skip_serializing_if = "Option::is_none")]
        privacy_level: Option<TikTokPrivacyLevel>,
        #[serde(rename = "videoCoverTimestampMs")]
        #[serde(skip_serializing_if = "Option::is_none")]
        video_cover_timestamp_ms: Option<i64>,
    },

    #[serde(rename = "pinterest")]
    #[non_exhaustive]
    Pinterest {
        #[serde(rename = "boardId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        board_id: Option<String>,
        #[serde(rename = "boardSectionId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        board_section_id: Option<String>,
        #[serde(rename = "coverSecond")]
        #[serde(skip_serializing_if = "Option::is_none")]
        cover_second: Option<i64>,
        #[serde(rename = "dominantColor")]
        #[serde(skip_serializing_if = "Option::is_none")]
        dominant_color: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        link: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        title: Option<String>,
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

    #[serde(rename = "mastodon")]
    #[non_exhaustive]
    Mastodon {
        #[serde(rename = "contentWarning")]
        #[serde(skip_serializing_if = "Option::is_none")]
        content_warning: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        language: Option<String>,
        #[serde(rename = "quotePolicy")]
        #[serde(skip_serializing_if = "Option::is_none")]
        quote_policy: Option<MastodonQuotePolicy>,
        #[serde(skip_serializing_if = "Option::is_none")]
        sensitive: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        visibility: Option<MastodonVisibility>,
    },

    #[serde(rename = "bluesky")]
    #[non_exhaustive]
    Bluesky {
        #[serde(rename = "contentLabel")]
        #[serde(skip_serializing_if = "Option::is_none")]
        content_label: Option<BlueskyContentLabel>,
        #[serde(rename = "disableQuotes")]
        #[serde(skip_serializing_if = "Option::is_none")]
        disable_quotes: Option<bool>,
        #[serde(skip_serializing_if = "Option::is_none")]
        languages: Option<Vec<String>>,
        #[serde(skip_serializing_if = "Option::is_none")]
        replies: Option<BlueskyReplies>,
        #[serde(rename = "replyFollowers")]
        #[serde(skip_serializing_if = "Option::is_none")]
        reply_followers: Option<bool>,
        #[serde(rename = "replyFollowing")]
        #[serde(skip_serializing_if = "Option::is_none")]
        reply_following: Option<bool>,
        #[serde(rename = "replyMentioned")]
        #[serde(skip_serializing_if = "Option::is_none")]
        reply_mentioned: Option<bool>,
    },

    #[serde(rename = "threads")]
    #[non_exhaustive]
    Threads {
        #[serde(rename = "linkAttachment")]
        #[serde(skip_serializing_if = "Option::is_none")]
        link_attachment: Option<String>,
        #[serde(rename = "replyControl")]
        #[serde(skip_serializing_if = "Option::is_none")]
        reply_control: Option<ThreadsReplyControl>,
        #[serde(rename = "topicTag")]
        #[serde(skip_serializing_if = "Option::is_none")]
        topic_tag: Option<String>,
    },

    #[serde(rename = "x")]
    #[non_exhaustive]
    X {
        #[serde(rename = "communityId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        community_id: Option<String>,
        #[serde(rename = "madeWithAi")]
        #[serde(skip_serializing_if = "Option::is_none")]
        made_with_ai: Option<bool>,
        #[serde(rename = "paidPartnership")]
        #[serde(skip_serializing_if = "Option::is_none")]
        paid_partnership: Option<bool>,
        #[serde(rename = "replySettings")]
        #[serde(skip_serializing_if = "Option::is_none")]
        reply_settings: Option<XReplySettings>,
        #[serde(rename = "shareWithFollowers")]
        #[serde(skip_serializing_if = "Option::is_none")]
        share_with_followers: Option<bool>,
    },

    #[serde(rename = "instagram")]
    #[non_exhaustive]
    Instagram {
        #[serde(rename = "audioName")]
        #[serde(skip_serializing_if = "Option::is_none")]
        audio_name: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        collaborators: Option<Vec<String>>,
        #[serde(rename = "coverMediaId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        cover_media_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        format: Option<InstagramFormat>,
        #[serde(rename = "shareToFeed")]
        #[serde(skip_serializing_if = "Option::is_none")]
        share_to_feed: Option<bool>,
        #[serde(rename = "thumbOffsetMs")]
        #[serde(skip_serializing_if = "Option::is_none")]
        thumb_offset_ms: Option<i64>,
        #[serde(rename = "trialReel")]
        #[serde(skip_serializing_if = "Option::is_none")]
        trial_reel: Option<InstagramTrialReel>,
    },

    #[serde(rename = "facebook")]
    #[non_exhaustive]
    Facebook {
        #[serde(skip_serializing_if = "Option::is_none")]
        format: Option<FacebookFormat>,
        #[serde(rename = "videoTitle")]
        #[serde(skip_serializing_if = "Option::is_none")]
        video_title: Option<String>,
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
            default_language: None,
            embeddable: None,
            license: None,
            made_for_kids: None,
            notify_subscribers: None,
            privacy: None,
            public_stats_viewable: None,
            recording_date: None,
            tags: None,
            thumbnail_media_id: None,
            title: None,
        }
    }

    pub fn tiktok() -> Self {
        Self::Tiktok {
            ai_generated: None,
            auto_add_music: None,
            brand_content: None,
            brand_organic: None,
            commercial_content: None,
            disable_comment: None,
            disable_duet: None,
            disable_stitch: None,
            photo_cover_index: None,
            photo_title: None,
            privacy_level: None,
            video_cover_timestamp_ms: None,
        }
    }

    pub fn pinterest() -> Self {
        Self::Pinterest {
            board_id: None,
            board_section_id: None,
            cover_second: None,
            dominant_color: None,
            link: None,
            title: None,
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

    pub fn mastodon() -> Self {
        Self::Mastodon {
            content_warning: None,
            language: None,
            quote_policy: None,
            sensitive: None,
            visibility: None,
        }
    }

    pub fn bluesky() -> Self {
        Self::Bluesky {
            content_label: None,
            disable_quotes: None,
            languages: None,
            replies: None,
            reply_followers: None,
            reply_following: None,
            reply_mentioned: None,
        }
    }

    pub fn threads() -> Self {
        Self::Threads {
            link_attachment: None,
            reply_control: None,
            topic_tag: None,
        }
    }

    pub fn x() -> Self {
        Self::X {
            community_id: None,
            made_with_ai: None,
            paid_partnership: None,
            reply_settings: None,
            share_with_followers: None,
        }
    }

    pub fn instagram() -> Self {
        Self::Instagram {
            audio_name: None,
            collaborators: None,
            cover_media_id: None,
            format: None,
            share_to_feed: None,
            thumb_offset_ms: None,
            trial_reel: None,
        }
    }

    pub fn facebook() -> Self {
        Self::Facebook {
            format: None,
            video_title: None,
        }
    }

    pub fn youtube_with_category_id(
        category_id: String,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id: Some(category_id),
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_contains_synthetic_media(
        category_id: Option<String>,
        contains_synthetic_media: bool,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media: Some(contains_synthetic_media),
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_default_language(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: String,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language: Some(default_language),
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_embeddable(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: bool,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable: Some(embeddable),
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_license(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: YouTubeLicense,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license: Some(license),
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_made_for_kids(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: bool,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids: Some(made_for_kids),
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_notify_subscribers(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: bool,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers: Some(notify_subscribers),
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_privacy(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: YouTubePrivacy,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy: Some(privacy),
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_public_stats_viewable(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: bool,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable: Some(public_stats_viewable),
            recording_date,
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_recording_date(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: String,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date: Some(recording_date),
            tags,
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_tags(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Vec<String>,
        thumbnail_media_id: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags: Some(tags),
            thumbnail_media_id,
            title,
        }
    }

    pub fn youtube_with_thumbnail_media_id(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: String,
        title: Option<String>,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id: Some(thumbnail_media_id),
            title,
        }
    }

    pub fn youtube_with_title(
        category_id: Option<String>,
        contains_synthetic_media: Option<bool>,
        default_language: Option<String>,
        embeddable: Option<bool>,
        license: Option<YouTubeLicense>,
        made_for_kids: Option<bool>,
        notify_subscribers: Option<bool>,
        privacy: Option<YouTubePrivacy>,
        public_stats_viewable: Option<bool>,
        recording_date: Option<String>,
        tags: Option<Vec<String>>,
        thumbnail_media_id: Option<String>,
        title: String,
    ) -> Self {
        Self::Youtube {
            category_id,
            contains_synthetic_media,
            default_language,
            embeddable,
            license,
            made_for_kids,
            notify_subscribers,
            privacy,
            public_stats_viewable,
            recording_date,
            tags,
            thumbnail_media_id,
            title: Some(title),
        }
    }

    pub fn tiktok_with_ai_generated(
        ai_generated: bool,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated: Some(ai_generated),
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_auto_add_music(
        ai_generated: Option<bool>,
        auto_add_music: bool,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music: Some(auto_add_music),
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_brand_content(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: bool,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content: Some(brand_content),
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_brand_organic(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: bool,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic: Some(brand_organic),
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_commercial_content(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: bool,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content: Some(commercial_content),
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_disable_comment(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: bool,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment: Some(disable_comment),
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_disable_duet(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: bool,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet: Some(disable_duet),
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_disable_stitch(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: bool,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch: Some(disable_stitch),
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_photo_cover_index(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: i64,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index: Some(photo_cover_index),
            photo_title,
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_photo_title(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: String,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title: Some(photo_title),
            privacy_level,
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_privacy_level(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: TikTokPrivacyLevel,
        video_cover_timestamp_ms: Option<i64>,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level: Some(privacy_level),
            video_cover_timestamp_ms,
        }
    }

    pub fn tiktok_with_video_cover_timestamp_ms(
        ai_generated: Option<bool>,
        auto_add_music: Option<bool>,
        brand_content: Option<bool>,
        brand_organic: Option<bool>,
        commercial_content: Option<bool>,
        disable_comment: Option<bool>,
        disable_duet: Option<bool>,
        disable_stitch: Option<bool>,
        photo_cover_index: Option<i64>,
        photo_title: Option<String>,
        privacy_level: Option<TikTokPrivacyLevel>,
        video_cover_timestamp_ms: i64,
    ) -> Self {
        Self::Tiktok {
            ai_generated,
            auto_add_music,
            brand_content,
            brand_organic,
            commercial_content,
            disable_comment,
            disable_duet,
            disable_stitch,
            photo_cover_index,
            photo_title,
            privacy_level,
            video_cover_timestamp_ms: Some(video_cover_timestamp_ms),
        }
    }

    pub fn pinterest_with_board_id(
        board_id: String,
        board_section_id: Option<String>,
        cover_second: Option<i64>,
        dominant_color: Option<String>,
        link: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Pinterest {
            board_id: Some(board_id),
            board_section_id,
            cover_second,
            dominant_color,
            link,
            title,
        }
    }

    pub fn pinterest_with_board_section_id(
        board_id: Option<String>,
        board_section_id: String,
        cover_second: Option<i64>,
        dominant_color: Option<String>,
        link: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Pinterest {
            board_id,
            board_section_id: Some(board_section_id),
            cover_second,
            dominant_color,
            link,
            title,
        }
    }

    pub fn pinterest_with_cover_second(
        board_id: Option<String>,
        board_section_id: Option<String>,
        cover_second: i64,
        dominant_color: Option<String>,
        link: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Pinterest {
            board_id,
            board_section_id,
            cover_second: Some(cover_second),
            dominant_color,
            link,
            title,
        }
    }

    pub fn pinterest_with_dominant_color(
        board_id: Option<String>,
        board_section_id: Option<String>,
        cover_second: Option<i64>,
        dominant_color: String,
        link: Option<String>,
        title: Option<String>,
    ) -> Self {
        Self::Pinterest {
            board_id,
            board_section_id,
            cover_second,
            dominant_color: Some(dominant_color),
            link,
            title,
        }
    }

    pub fn pinterest_with_link(
        board_id: Option<String>,
        board_section_id: Option<String>,
        cover_second: Option<i64>,
        dominant_color: Option<String>,
        link: String,
        title: Option<String>,
    ) -> Self {
        Self::Pinterest {
            board_id,
            board_section_id,
            cover_second,
            dominant_color,
            link: Some(link),
            title,
        }
    }

    pub fn pinterest_with_title(
        board_id: Option<String>,
        board_section_id: Option<String>,
        cover_second: Option<i64>,
        dominant_color: Option<String>,
        link: Option<String>,
        title: String,
    ) -> Self {
        Self::Pinterest {
            board_id,
            board_section_id,
            cover_second,
            dominant_color,
            link,
            title: Some(title),
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

    pub fn mastodon_with_content_warning(
        content_warning: String,
        language: Option<String>,
        quote_policy: Option<MastodonQuotePolicy>,
        sensitive: Option<bool>,
        visibility: Option<MastodonVisibility>,
    ) -> Self {
        Self::Mastodon {
            content_warning: Some(content_warning),
            language,
            quote_policy,
            sensitive,
            visibility,
        }
    }

    pub fn mastodon_with_language(
        content_warning: Option<String>,
        language: String,
        quote_policy: Option<MastodonQuotePolicy>,
        sensitive: Option<bool>,
        visibility: Option<MastodonVisibility>,
    ) -> Self {
        Self::Mastodon {
            content_warning,
            language: Some(language),
            quote_policy,
            sensitive,
            visibility,
        }
    }

    pub fn mastodon_with_quote_policy(
        content_warning: Option<String>,
        language: Option<String>,
        quote_policy: MastodonQuotePolicy,
        sensitive: Option<bool>,
        visibility: Option<MastodonVisibility>,
    ) -> Self {
        Self::Mastodon {
            content_warning,
            language,
            quote_policy: Some(quote_policy),
            sensitive,
            visibility,
        }
    }

    pub fn mastodon_with_sensitive(
        content_warning: Option<String>,
        language: Option<String>,
        quote_policy: Option<MastodonQuotePolicy>,
        sensitive: bool,
        visibility: Option<MastodonVisibility>,
    ) -> Self {
        Self::Mastodon {
            content_warning,
            language,
            quote_policy,
            sensitive: Some(sensitive),
            visibility,
        }
    }

    pub fn mastodon_with_visibility(
        content_warning: Option<String>,
        language: Option<String>,
        quote_policy: Option<MastodonQuotePolicy>,
        sensitive: Option<bool>,
        visibility: MastodonVisibility,
    ) -> Self {
        Self::Mastodon {
            content_warning,
            language,
            quote_policy,
            sensitive,
            visibility: Some(visibility),
        }
    }

    pub fn bluesky_with_content_label(
        content_label: BlueskyContentLabel,
        disable_quotes: Option<bool>,
        languages: Option<Vec<String>>,
        replies: Option<BlueskyReplies>,
        reply_followers: Option<bool>,
        reply_following: Option<bool>,
        reply_mentioned: Option<bool>,
    ) -> Self {
        Self::Bluesky {
            content_label: Some(content_label),
            disable_quotes,
            languages,
            replies,
            reply_followers,
            reply_following,
            reply_mentioned,
        }
    }

    pub fn bluesky_with_disable_quotes(
        content_label: Option<BlueskyContentLabel>,
        disable_quotes: bool,
        languages: Option<Vec<String>>,
        replies: Option<BlueskyReplies>,
        reply_followers: Option<bool>,
        reply_following: Option<bool>,
        reply_mentioned: Option<bool>,
    ) -> Self {
        Self::Bluesky {
            content_label,
            disable_quotes: Some(disable_quotes),
            languages,
            replies,
            reply_followers,
            reply_following,
            reply_mentioned,
        }
    }

    pub fn bluesky_with_languages(
        content_label: Option<BlueskyContentLabel>,
        disable_quotes: Option<bool>,
        languages: Vec<String>,
        replies: Option<BlueskyReplies>,
        reply_followers: Option<bool>,
        reply_following: Option<bool>,
        reply_mentioned: Option<bool>,
    ) -> Self {
        Self::Bluesky {
            content_label,
            disable_quotes,
            languages: Some(languages),
            replies,
            reply_followers,
            reply_following,
            reply_mentioned,
        }
    }

    pub fn bluesky_with_replies(
        content_label: Option<BlueskyContentLabel>,
        disable_quotes: Option<bool>,
        languages: Option<Vec<String>>,
        replies: BlueskyReplies,
        reply_followers: Option<bool>,
        reply_following: Option<bool>,
        reply_mentioned: Option<bool>,
    ) -> Self {
        Self::Bluesky {
            content_label,
            disable_quotes,
            languages,
            replies: Some(replies),
            reply_followers,
            reply_following,
            reply_mentioned,
        }
    }

    pub fn bluesky_with_reply_followers(
        content_label: Option<BlueskyContentLabel>,
        disable_quotes: Option<bool>,
        languages: Option<Vec<String>>,
        replies: Option<BlueskyReplies>,
        reply_followers: bool,
        reply_following: Option<bool>,
        reply_mentioned: Option<bool>,
    ) -> Self {
        Self::Bluesky {
            content_label,
            disable_quotes,
            languages,
            replies,
            reply_followers: Some(reply_followers),
            reply_following,
            reply_mentioned,
        }
    }

    pub fn bluesky_with_reply_following(
        content_label: Option<BlueskyContentLabel>,
        disable_quotes: Option<bool>,
        languages: Option<Vec<String>>,
        replies: Option<BlueskyReplies>,
        reply_followers: Option<bool>,
        reply_following: bool,
        reply_mentioned: Option<bool>,
    ) -> Self {
        Self::Bluesky {
            content_label,
            disable_quotes,
            languages,
            replies,
            reply_followers,
            reply_following: Some(reply_following),
            reply_mentioned,
        }
    }

    pub fn bluesky_with_reply_mentioned(
        content_label: Option<BlueskyContentLabel>,
        disable_quotes: Option<bool>,
        languages: Option<Vec<String>>,
        replies: Option<BlueskyReplies>,
        reply_followers: Option<bool>,
        reply_following: Option<bool>,
        reply_mentioned: bool,
    ) -> Self {
        Self::Bluesky {
            content_label,
            disable_quotes,
            languages,
            replies,
            reply_followers,
            reply_following,
            reply_mentioned: Some(reply_mentioned),
        }
    }

    pub fn threads_with_link_attachment(
        link_attachment: String,
        reply_control: Option<ThreadsReplyControl>,
        topic_tag: Option<String>,
    ) -> Self {
        Self::Threads {
            link_attachment: Some(link_attachment),
            reply_control,
            topic_tag,
        }
    }

    pub fn threads_with_reply_control(
        link_attachment: Option<String>,
        reply_control: ThreadsReplyControl,
        topic_tag: Option<String>,
    ) -> Self {
        Self::Threads {
            link_attachment,
            reply_control: Some(reply_control),
            topic_tag,
        }
    }

    pub fn threads_with_topic_tag(
        link_attachment: Option<String>,
        reply_control: Option<ThreadsReplyControl>,
        topic_tag: String,
    ) -> Self {
        Self::Threads {
            link_attachment,
            reply_control,
            topic_tag: Some(topic_tag),
        }
    }

    pub fn x_with_community_id(
        community_id: String,
        made_with_ai: Option<bool>,
        paid_partnership: Option<bool>,
        reply_settings: Option<XReplySettings>,
        share_with_followers: Option<bool>,
    ) -> Self {
        Self::X {
            community_id: Some(community_id),
            made_with_ai,
            paid_partnership,
            reply_settings,
            share_with_followers,
        }
    }

    pub fn x_with_made_with_ai(
        community_id: Option<String>,
        made_with_ai: bool,
        paid_partnership: Option<bool>,
        reply_settings: Option<XReplySettings>,
        share_with_followers: Option<bool>,
    ) -> Self {
        Self::X {
            community_id,
            made_with_ai: Some(made_with_ai),
            paid_partnership,
            reply_settings,
            share_with_followers,
        }
    }

    pub fn x_with_paid_partnership(
        community_id: Option<String>,
        made_with_ai: Option<bool>,
        paid_partnership: bool,
        reply_settings: Option<XReplySettings>,
        share_with_followers: Option<bool>,
    ) -> Self {
        Self::X {
            community_id,
            made_with_ai,
            paid_partnership: Some(paid_partnership),
            reply_settings,
            share_with_followers,
        }
    }

    pub fn x_with_reply_settings(
        community_id: Option<String>,
        made_with_ai: Option<bool>,
        paid_partnership: Option<bool>,
        reply_settings: XReplySettings,
        share_with_followers: Option<bool>,
    ) -> Self {
        Self::X {
            community_id,
            made_with_ai,
            paid_partnership,
            reply_settings: Some(reply_settings),
            share_with_followers,
        }
    }

    pub fn x_with_share_with_followers(
        community_id: Option<String>,
        made_with_ai: Option<bool>,
        paid_partnership: Option<bool>,
        reply_settings: Option<XReplySettings>,
        share_with_followers: bool,
    ) -> Self {
        Self::X {
            community_id,
            made_with_ai,
            paid_partnership,
            reply_settings,
            share_with_followers: Some(share_with_followers),
        }
    }

    pub fn instagram_with_audio_name(
        audio_name: String,
        collaborators: Option<Vec<String>>,
        cover_media_id: Option<String>,
        format: Option<InstagramFormat>,
        share_to_feed: Option<bool>,
        thumb_offset_ms: Option<i64>,
        trial_reel: Option<InstagramTrialReel>,
    ) -> Self {
        Self::Instagram {
            audio_name: Some(audio_name),
            collaborators,
            cover_media_id,
            format,
            share_to_feed,
            thumb_offset_ms,
            trial_reel,
        }
    }

    pub fn instagram_with_collaborators(
        audio_name: Option<String>,
        collaborators: Vec<String>,
        cover_media_id: Option<String>,
        format: Option<InstagramFormat>,
        share_to_feed: Option<bool>,
        thumb_offset_ms: Option<i64>,
        trial_reel: Option<InstagramTrialReel>,
    ) -> Self {
        Self::Instagram {
            audio_name,
            collaborators: Some(collaborators),
            cover_media_id,
            format,
            share_to_feed,
            thumb_offset_ms,
            trial_reel,
        }
    }

    pub fn instagram_with_cover_media_id(
        audio_name: Option<String>,
        collaborators: Option<Vec<String>>,
        cover_media_id: String,
        format: Option<InstagramFormat>,
        share_to_feed: Option<bool>,
        thumb_offset_ms: Option<i64>,
        trial_reel: Option<InstagramTrialReel>,
    ) -> Self {
        Self::Instagram {
            audio_name,
            collaborators,
            cover_media_id: Some(cover_media_id),
            format,
            share_to_feed,
            thumb_offset_ms,
            trial_reel,
        }
    }

    pub fn instagram_with_format(
        audio_name: Option<String>,
        collaborators: Option<Vec<String>>,
        cover_media_id: Option<String>,
        format: InstagramFormat,
        share_to_feed: Option<bool>,
        thumb_offset_ms: Option<i64>,
        trial_reel: Option<InstagramTrialReel>,
    ) -> Self {
        Self::Instagram {
            audio_name,
            collaborators,
            cover_media_id,
            format: Some(format),
            share_to_feed,
            thumb_offset_ms,
            trial_reel,
        }
    }

    pub fn instagram_with_share_to_feed(
        audio_name: Option<String>,
        collaborators: Option<Vec<String>>,
        cover_media_id: Option<String>,
        format: Option<InstagramFormat>,
        share_to_feed: bool,
        thumb_offset_ms: Option<i64>,
        trial_reel: Option<InstagramTrialReel>,
    ) -> Self {
        Self::Instagram {
            audio_name,
            collaborators,
            cover_media_id,
            format,
            share_to_feed: Some(share_to_feed),
            thumb_offset_ms,
            trial_reel,
        }
    }

    pub fn instagram_with_thumb_offset_ms(
        audio_name: Option<String>,
        collaborators: Option<Vec<String>>,
        cover_media_id: Option<String>,
        format: Option<InstagramFormat>,
        share_to_feed: Option<bool>,
        thumb_offset_ms: i64,
        trial_reel: Option<InstagramTrialReel>,
    ) -> Self {
        Self::Instagram {
            audio_name,
            collaborators,
            cover_media_id,
            format,
            share_to_feed,
            thumb_offset_ms: Some(thumb_offset_ms),
            trial_reel,
        }
    }

    pub fn instagram_with_trial_reel(
        audio_name: Option<String>,
        collaborators: Option<Vec<String>>,
        cover_media_id: Option<String>,
        format: Option<InstagramFormat>,
        share_to_feed: Option<bool>,
        thumb_offset_ms: Option<i64>,
        trial_reel: InstagramTrialReel,
    ) -> Self {
        Self::Instagram {
            audio_name,
            collaborators,
            cover_media_id,
            format,
            share_to_feed,
            thumb_offset_ms,
            trial_reel: Some(trial_reel),
        }
    }

    pub fn facebook_with_format(format: FacebookFormat, video_title: Option<String>) -> Self {
        Self::Facebook {
            format: Some(format),
            video_title,
        }
    }

    pub fn facebook_with_video_title(format: Option<FacebookFormat>, video_title: String) -> Self {
        Self::Facebook {
            format,
            video_title: Some(video_title),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
