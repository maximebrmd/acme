pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LivePostChanges {
    #[serde(default)]
    pub items: Vec<LivePostChange>,
}

impl LivePostChanges {
    pub fn builder() -> LivePostChangesBuilder {
        <LivePostChangesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePostChangesBuilder {
    items: Option<Vec<LivePostChange>>,
}

impl LivePostChangesBuilder {
    pub fn items(mut self, value: Vec<LivePostChange>) -> Self {
        self.items = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`LivePostChanges`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](LivePostChangesBuilder::items)
    pub fn build(self) -> Result<LivePostChanges, BuildError> {
        Ok(LivePostChanges {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
        })
    }
}
