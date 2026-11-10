pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ImportResult {
    #[serde(default)]
    pub created: i64,
    #[serde(rename = "dryRun")]
    #[serde(default)]
    pub dry_run: bool,
    #[serde(default)]
    pub rows: Vec<ImportRowResult>,
}

impl ImportResult {
    pub fn builder() -> ImportResultBuilder {
        <ImportResultBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImportResultBuilder {
    created: Option<i64>,
    dry_run: Option<bool>,
    rows: Option<Vec<ImportRowResult>>,
}

impl ImportResultBuilder {
    pub fn created(mut self, value: i64) -> Self {
        self.created = Some(value);
        self
    }

    pub fn dry_run(mut self, value: bool) -> Self {
        self.dry_run = Some(value);
        self
    }

    pub fn rows(mut self, value: Vec<ImportRowResult>) -> Self {
        self.rows = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ImportResult`].
    /// This method will fail if any of the following fields are not set:
    /// - [`created`](ImportResultBuilder::created)
    /// - [`dry_run`](ImportResultBuilder::dry_run)
    /// - [`rows`](ImportResultBuilder::rows)
    pub fn build(self) -> Result<ImportResult, BuildError> {
        Ok(ImportResult {
            created: self
                .created
                .ok_or_else(|| BuildError::missing_field("created"))?,
            dry_run: self
                .dry_run
                .ok_or_else(|| BuildError::missing_field("dry_run"))?,
            rows: self.rows.ok_or_else(|| BuildError::missing_field("rows"))?,
        })
    }
}
