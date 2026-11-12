pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLink {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub clicks: i64,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub destination: String,
    #[serde(default)]
    pub disabled: bool,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub part: i64,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "shortUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_url: Option<String>,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
}

impl ShortLink {
    pub fn builder() -> ShortLinkBuilder {
        <ShortLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkBuilder {
    channel_id: Option<String>,
    clicks: Option<i64>,
    created_at: Option<String>,
    destination: Option<String>,
    disabled: Option<bool>,
    id: Option<String>,
    part: Option<i64>,
    post_id: Option<String>,
    short_url: Option<String>,
    target_id: Option<String>,
}

impl ShortLinkBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn clicks(mut self, value: i64) -> Self {
        self.clicks = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn destination(mut self, value: impl Into<String>) -> Self {
        self.destination = Some(value.into());
        self
    }

    pub fn disabled(mut self, value: bool) -> Self {
        self.disabled = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn part(mut self, value: i64) -> Self {
        self.part = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn short_url(mut self, value: impl Into<String>) -> Self {
        self.short_url = Some(value.into());
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ShortLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](ShortLinkBuilder::channel_id)
    /// - [`clicks`](ShortLinkBuilder::clicks)
    /// - [`created_at`](ShortLinkBuilder::created_at)
    /// - [`destination`](ShortLinkBuilder::destination)
    /// - [`disabled`](ShortLinkBuilder::disabled)
    /// - [`id`](ShortLinkBuilder::id)
    /// - [`part`](ShortLinkBuilder::part)
    /// - [`post_id`](ShortLinkBuilder::post_id)
    /// - [`target_id`](ShortLinkBuilder::target_id)
    pub fn build(self) -> Result<ShortLink, BuildError> {
        Ok(ShortLink {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            clicks: self
                .clicks
                .ok_or_else(|| BuildError::missing_field("clicks"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            destination: self
                .destination
                .ok_or_else(|| BuildError::missing_field("destination"))?,
            disabled: self
                .disabled
                .ok_or_else(|| BuildError::missing_field("disabled"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            part: self.part.ok_or_else(|| BuildError::missing_field("part"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            short_url: self.short_url,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
        })
    }
}
