pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PreviewSlot {
    #[serde(default)]
    pub at: String,
    #[serde(rename = "postId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub post_id: Option<String>,
}

impl PreviewSlot {
    pub fn builder() -> PreviewSlotBuilder {
        <PreviewSlotBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PreviewSlotBuilder {
    at: Option<String>,
    post_id: Option<String>,
}

impl PreviewSlotBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PreviewSlot`].
    /// This method will fail if any of the following fields are not set:
    /// - [`at`](PreviewSlotBuilder::at)
    pub fn build(self) -> Result<PreviewSlot, BuildError> {
        Ok(PreviewSlot {
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            post_id: self.post_id,
        })
    }
}
