pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewCommentAnchor {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub selection: Option<NewCommentAnchorSelection>,
}

impl NewCommentAnchor {
    pub fn builder() -> NewCommentAnchorBuilder {
        <NewCommentAnchorBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewCommentAnchorBuilder {
    channel_id: Option<String>,
    selection: Option<NewCommentAnchorSelection>,
}

impl NewCommentAnchorBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn selection(mut self, value: NewCommentAnchorSelection) -> Self {
        self.selection = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewCommentAnchor`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](NewCommentAnchorBuilder::channel_id)
    pub fn build(self) -> Result<NewCommentAnchor, BuildError> {
        Ok(NewCommentAnchor {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            selection: self.selection,
        })
    }
}
