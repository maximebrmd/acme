pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct QueuePost {
    #[serde(rename = "channelIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_ids: Option<Vec<String>>,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
}

impl QueuePost {
    pub fn builder() -> QueuePostBuilder {
        <QueuePostBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct QueuePostBuilder {
    channel_ids: Option<Vec<String>>,
    queue_id: Option<String>,
}

impl QueuePostBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`QueuePost`].
    pub fn build(self) -> Result<QueuePost, BuildError> {
        Ok(QueuePost {
            channel_ids: self.channel_ids,
            queue_id: self.queue_id,
        })
    }
}
