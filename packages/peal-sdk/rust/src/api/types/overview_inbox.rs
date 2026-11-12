pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OverviewInbox {
    #[serde(default)]
    pub unanswered: i64,
}

impl OverviewInbox {
    pub fn builder() -> OverviewInboxBuilder {
        <OverviewInboxBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OverviewInboxBuilder {
    unanswered: Option<i64>,
}

impl OverviewInboxBuilder {
    pub fn unanswered(mut self, value: i64) -> Self {
        self.unanswered = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`OverviewInbox`].
    /// This method will fail if any of the following fields are not set:
    /// - [`unanswered`](OverviewInboxBuilder::unanswered)
    pub fn build(self) -> Result<OverviewInbox, BuildError> {
        Ok(OverviewInbox {
            unanswered: self
                .unanswered
                .ok_or_else(|| BuildError::missing_field("unanswered"))?,
        })
    }
}
