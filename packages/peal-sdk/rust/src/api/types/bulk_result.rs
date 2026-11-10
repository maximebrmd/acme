pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct BulkResult {
    #[serde(default)]
    pub created: i64,
    #[serde(default)]
    pub items: Vec<BulkPostResult>,
    #[serde(default)]
    pub refused: i64,
}

impl BulkResult {
    pub fn builder() -> BulkResultBuilder {
        <BulkResultBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BulkResultBuilder {
    created: Option<i64>,
    items: Option<Vec<BulkPostResult>>,
    refused: Option<i64>,
}

impl BulkResultBuilder {
    pub fn created(mut self, value: i64) -> Self {
        self.created = Some(value);
        self
    }

    pub fn items(mut self, value: Vec<BulkPostResult>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn refused(mut self, value: i64) -> Self {
        self.refused = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BulkResult`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created`](BulkResultBuilder::created)
    /// - [`items`](BulkResultBuilder::items)
    /// - [`refused`](BulkResultBuilder::refused)
    pub fn build(self) -> Result<BulkResult, BuildError> {
        Ok(BulkResult {
            created: self
                .created
                .ok_or_else(|| BuildError::missing_field("created"))?,
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            refused: self
                .refused
                .ok_or_else(|| BuildError::missing_field("refused"))?,
        })
    }
}
