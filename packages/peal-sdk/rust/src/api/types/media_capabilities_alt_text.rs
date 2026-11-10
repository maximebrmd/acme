pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaCapabilitiesAltText {
    #[serde(rename = "maxLength")]
    #[serde(default)]
    pub max_length: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shown: Option<bool>,
}

impl MediaCapabilitiesAltText {
    pub fn builder() -> MediaCapabilitiesAltTextBuilder {
        <MediaCapabilitiesAltTextBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaCapabilitiesAltTextBuilder {
    max_length: Option<i64>,
    shown: Option<bool>,
}

impl MediaCapabilitiesAltTextBuilder {
    pub fn max_length(mut self, value: i64) -> Self {
        self.max_length = Some(value);
        self
    }

    pub fn shown(mut self, value: bool) -> Self {
        self.shown = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaCapabilitiesAltText`].
    /// This method will fail if any of the following fields are not set:
    /// - [`max_length`](MediaCapabilitiesAltTextBuilder::max_length)
    pub fn build(self) -> Result<MediaCapabilitiesAltText, BuildError> {
        Ok(MediaCapabilitiesAltText {
            max_length: self
                .max_length
                .ok_or_else(|| BuildError::missing_field("max_length"))?,
            shown: self.shown,
        })
    }
}
