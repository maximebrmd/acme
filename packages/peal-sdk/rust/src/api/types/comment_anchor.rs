pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CommentAnchor {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection: Option<CommentSelection>,
}

impl CommentAnchor {
    pub fn builder() -> CommentAnchorBuilder {
        <CommentAnchorBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentAnchorBuilder {
    channel_id: Option<String>,
    selection: Option<CommentSelection>,
}

impl CommentAnchorBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn selection(mut self, value: CommentSelection) -> Self {
        self.selection = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CommentAnchor`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](CommentAnchorBuilder::channel_id)
    pub fn build(self) -> Result<CommentAnchor, BuildError> {
        Ok(CommentAnchor {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            selection: self.selection,
        })
    }
}
