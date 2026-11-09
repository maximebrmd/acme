pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnknownMediaEncoded {
    #[serde(rename = "mediaIds")]
    #[serde(default)]
    pub media_ids: Vec<String>,
}

impl UnknownMediaEncoded {
    pub fn builder() -> UnknownMediaEncodedBuilder {
        <UnknownMediaEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnknownMediaEncodedBuilder {
    media_ids: Option<Vec<String>>,
}

impl UnknownMediaEncodedBuilder {
    pub fn media_ids(mut self, value: Vec<String>) -> Self {
        self.media_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnknownMediaEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`media_ids`](UnknownMediaEncodedBuilder::media_ids)
    pub fn build(self) -> Result<UnknownMediaEncoded, BuildError> {
        Ok(UnknownMediaEncoded {
            media_ids: self
                .media_ids
                .ok_or_else(|| BuildError::missing_field("media_ids"))?,
        })
    }
}
