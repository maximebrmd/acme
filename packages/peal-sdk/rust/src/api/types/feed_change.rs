pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FeedChange {
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
    pub status: Option<FeedChangeStatus>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub template: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub url: Option<String>,
}

impl FeedChange {
    pub fn builder() -> FeedChangeBuilder {
        <FeedChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FeedChangeBuilder {
    attach_picture: Option<bool>,
    channel_ids: Option<Vec<String>>,
    channel_set_id: Option<String>,
    mode: Option<FeedMode>,
    queue_id: Option<String>,
    status: Option<FeedChangeStatus>,
    template: Option<String>,
    url: Option<String>,
}

impl FeedChangeBuilder {
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

    pub fn status(mut self, value: FeedChangeStatus) -> Self {
        self.status = Some(value);
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

    /// Consumes the builder and constructs a [`FeedChange`].
    pub fn build(self) -> Result<FeedChange, BuildError> {
        Ok(FeedChange {
            attach_picture: self.attach_picture,
            channel_ids: self.channel_ids,
            channel_set_id: self.channel_set_id,
            mode: self.mode,
            queue_id: self.queue_id,
            status: self.status,
            template: self.template,
            url: self.url,
        })
    }
}
