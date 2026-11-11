pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostUnpublish {
    #[serde(default)]
    pub changes: Vec<LivePostChange>,
    #[serde(default)]
    pub refused: Vec<LivePostRefusedTarget>,
}

impl PostUnpublish {
    pub fn builder() -> PostUnpublishBuilder {
        <PostUnpublishBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostUnpublishBuilder {
    changes: Option<Vec<LivePostChange>>,
    refused: Option<Vec<LivePostRefusedTarget>>,
}

impl PostUnpublishBuilder {
    pub fn changes(mut self, value: Vec<LivePostChange>) -> Self {
        self.changes = Some(value);
        self
    }

    pub fn refused(mut self, value: Vec<LivePostRefusedTarget>) -> Self {
        self.refused = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostUnpublish`].
    /// This method will fail if any of the following fields are not set:
    /// - [`changes`](PostUnpublishBuilder::changes)
    /// - [`refused`](PostUnpublishBuilder::refused)
    pub fn build(self) -> Result<PostUnpublish, BuildError> {
        Ok(PostUnpublish {
            changes: self
                .changes
                .ok_or_else(|| BuildError::missing_field("changes"))?,
            refused: self
                .refused
                .ok_or_else(|| BuildError::missing_field("refused"))?,
        })
    }
}
