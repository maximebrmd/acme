pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaImport {
    #[serde(rename = "altText")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_text: Option<String>,
    #[serde(default)]
    pub url: String,
}

impl MediaImport {
    pub fn builder() -> MediaImportBuilder {
        <MediaImportBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaImportBuilder {
    alt_text: Option<String>,
    url: Option<String>,
}

impl MediaImportBuilder {
    pub fn alt_text(mut self, value: impl Into<String>) -> Self {
        self.alt_text = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MediaImport`].
    /// This method will fail if any of the following fields are not set:
    /// - [`url`](MediaImportBuilder::url)
    pub fn build(self) -> Result<MediaImport, BuildError> {
        Ok(MediaImport {
            alt_text: self.alt_text,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
