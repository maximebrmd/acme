pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewFeed {
    #[serde(rename = "attachPicture")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub attach_picture: Option<bool>,
    #[serde(rename = "channelIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_ids: Option<Vec<String>>,
    #[serde(rename = "channelSetId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_set_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mode: Option<FeedMode>,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    #[serde(default)]
    pub url: String,
}

impl NewFeed {
    pub fn builder() -> NewFeedBuilder {
        <NewFeedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewFeedBuilder {
    attach_picture: Option<bool>,
    channel_ids: Option<Vec<String>>,
    channel_set_id: Option<String>,
    mode: Option<FeedMode>,
    queue_id: Option<String>,
    template: Option<String>,
    url: Option<String>,
}

impl NewFeedBuilder {
    pub fn attach_picture(mut self, value: bool) -> Self {
        self.attach_picture = Some(value);
        self
    }

    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn channel_set_id(mut self, value: impl Into<String>) -> Self {
        self.channel_set_id = Some(value.into());
        self
    }

    pub fn mode(mut self, value: FeedMode) -> Self {
        self.mode = Some(value);
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    pub fn template(mut self, value: impl Into<String>) -> Self {
        self.template = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewFeed`].
    /// This method will fail if any of the following fields are not set:
    /// - [`url`](NewFeedBuilder::url)
    pub fn build(self) -> Result<NewFeed, BuildError> {
        Ok(NewFeed {
            attach_picture: self.attach_picture,
            channel_ids: self.channel_ids,
            channel_set_id: self.channel_set_id,
            mode: self.mode,
            queue_id: self.queue_id,
            template: self.template,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
