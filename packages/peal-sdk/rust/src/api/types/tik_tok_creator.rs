pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TikTokCreator {
    #[serde(rename = "avatarUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub avatar_url: Option<String>,
    #[serde(rename = "commentDisabled")]
    #[serde(default)]
    pub comment_disabled: bool,
    #[serde(rename = "duetDisabled")]
    #[serde(default)]
    pub duet_disabled: bool,
    #[serde(rename = "maxVideoDurationMs")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_video_duration_ms: Option<i64>,
    #[serde(default)]
    pub nickname: String,
    #[serde(rename = "privacyLevels")]
    #[serde(default)]
    pub privacy_levels: Vec<TikTokPrivacyLevel>,
    #[serde(rename = "stitchDisabled")]
    #[serde(default)]
    pub stitch_disabled: bool,
    #[serde(default)]
    pub username: String,
}

impl TikTokCreator {
    pub fn builder() -> TikTokCreatorBuilder {
        <TikTokCreatorBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TikTokCreatorBuilder {
    avatar_url: Option<String>,
    comment_disabled: Option<bool>,
    duet_disabled: Option<bool>,
    max_video_duration_ms: Option<i64>,
    nickname: Option<String>,
    privacy_levels: Option<Vec<TikTokPrivacyLevel>>,
    stitch_disabled: Option<bool>,
    username: Option<String>,
}

impl TikTokCreatorBuilder {
    pub fn avatar_url(mut self, value: impl Into<String>) -> Self {
        self.avatar_url = Some(value.into());
        self
    }

    pub fn comment_disabled(mut self, value: bool) -> Self {
        self.comment_disabled = Some(value);
        self
    }

    pub fn duet_disabled(mut self, value: bool) -> Self {
        self.duet_disabled = Some(value);
        self
    }

    pub fn max_video_duration_ms(mut self, value: i64) -> Self {
        self.max_video_duration_ms = Some(value);
        self
    }

    pub fn nickname(mut self, value: impl Into<String>) -> Self {
        self.nickname = Some(value.into());
        self
    }

    pub fn privacy_levels(mut self, value: Vec<TikTokPrivacyLevel>) -> Self {
        self.privacy_levels = Some(value);
        self
    }

    pub fn stitch_disabled(mut self, value: bool) -> Self {
        self.stitch_disabled = Some(value);
        self
    }

    pub fn username(mut self, value: impl Into<String>) -> Self {
        self.username = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`TikTokCreator`].
    /// This method will fail if any of the following fields are not set:
    /// - [`comment_disabled`](TikTokCreatorBuilder::comment_disabled)
    /// - [`duet_disabled`](TikTokCreatorBuilder::duet_disabled)
    /// - [`nickname`](TikTokCreatorBuilder::nickname)
    /// - [`privacy_levels`](TikTokCreatorBuilder::privacy_levels)
    /// - [`stitch_disabled`](TikTokCreatorBuilder::stitch_disabled)
    /// - [`username`](TikTokCreatorBuilder::username)
    pub fn build(self) -> Result<TikTokCreator, BuildError> {
        Ok(TikTokCreator {
            avatar_url: self.avatar_url,
            comment_disabled: self
                .comment_disabled
                .ok_or_else(|| BuildError::missing_field("comment_disabled"))?,
            duet_disabled: self
                .duet_disabled
                .ok_or_else(|| BuildError::missing_field("duet_disabled"))?,
            max_video_duration_ms: self.max_video_duration_ms,
            nickname: self
                .nickname
                .ok_or_else(|| BuildError::missing_field("nickname"))?,
            privacy_levels: self
                .privacy_levels
                .ok_or_else(|| BuildError::missing_field("privacy_levels"))?,
            stitch_disabled: self
                .stitch_disabled
                .ok_or_else(|| BuildError::missing_field("stitch_disabled"))?,
            username: self
                .username
                .ok_or_else(|| BuildError::missing_field("username"))?,
        })
    }
}
