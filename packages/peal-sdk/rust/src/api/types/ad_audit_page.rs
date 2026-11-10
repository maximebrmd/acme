pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct AdAuditPage {
    #[serde(default)]
    pub entries: Vec<AdAuditEntry>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl AdAuditPage {
    pub fn builder() -> AdAuditPageBuilder {
        <AdAuditPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAuditPageBuilder {
    entries: Option<Vec<AdAuditEntry>>,
    next_cursor: Option<String>,
}

impl AdAuditPageBuilder {
    pub fn entries(mut self, value: Vec<AdAuditEntry>) -> Self {
        self.entries = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AdAuditPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`entries`](AdAuditPageBuilder::entries)
    pub fn build(self) -> Result<AdAuditPage, BuildError> {
        Ok(AdAuditPage {
            entries: self
                .entries
                .ok_or_else(|| BuildError::missing_field("entries"))?,
            next_cursor: self.next_cursor,
        })
    }
}
