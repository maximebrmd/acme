pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaDescription {
    #[serde(rename = "altText")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_text: Option<String>,
}

impl MediaDescription {
    pub fn builder() -> MediaDescriptionBuilder {
        <MediaDescriptionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaDescriptionBuilder {
    alt_text: Option<String>,
}

impl MediaDescriptionBuilder {
    pub fn alt_text(mut self, value: impl Into<String>) -> Self {
        self.alt_text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MediaDescription`].
    pub fn build(self) -> Result<MediaDescription, BuildError> {
        Ok(MediaDescription {
            alt_text: self.alt_text,
        })
    }
}
