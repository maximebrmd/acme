pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostImport {
    #[serde(default)]
    pub csv: String,
    #[serde(rename = "dryRun")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dry_run: Option<bool>,
}

impl PostImport {
    pub fn builder() -> PostImportBuilder {
        <PostImportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostImportBuilder {
    csv: Option<String>,
    dry_run: Option<bool>,
}

impl PostImportBuilder {
    pub fn csv(mut self, value: impl Into<String>) -> Self {
        self.csv = Some(value.into());
        self
    }

    pub fn dry_run(mut self, value: bool) -> Self {
        self.dry_run = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostImport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`csv`](PostImportBuilder::csv)
    pub fn build(self) -> Result<PostImport, BuildError> {
        Ok(PostImport {
            csv: self.csv.ok_or_else(|| BuildError::missing_field("csv"))?,
            dry_run: self.dry_run,
        })
    }
}
