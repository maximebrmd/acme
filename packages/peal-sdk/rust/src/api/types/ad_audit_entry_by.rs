pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdAuditEntryBy {
    #[serde(default)]
    pub id: String,
    pub kind: AdAuditEntryByKind,
    #[serde(rename = "viaClient")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub via_client: Option<String>,
}

impl AdAuditEntryBy {
    pub fn builder() -> AdAuditEntryByBuilder {
        <AdAuditEntryByBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAuditEntryByBuilder {
    id: Option<String>,
    kind: Option<AdAuditEntryByKind>,
    via_client: Option<String>,
}

impl AdAuditEntryByBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn kind(mut self, value: AdAuditEntryByKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn via_client(mut self, value: impl Into<String>) -> Self {
        self.via_client = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AdAuditEntryBy`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](AdAuditEntryByBuilder::id)
    /// - [`kind`](AdAuditEntryByBuilder::kind)
    pub fn build(self) -> Result<AdAuditEntryBy, BuildError> {
        Ok(AdAuditEntryBy {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            via_client: self.via_client,
        })
    }
}
