pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnsupportedMediaTypeEncoded {
    #[serde(rename = "contentType")]
    #[serde(default)]
    pub content_type: String,
}

impl UnsupportedMediaTypeEncoded {
    pub fn builder() -> UnsupportedMediaTypeEncodedBuilder {
        <UnsupportedMediaTypeEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnsupportedMediaTypeEncodedBuilder {
    content_type: Option<String>,
}

impl UnsupportedMediaTypeEncodedBuilder {
    pub fn content_type(mut self, value: impl Into<String>) -> Self {
        self.content_type = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`UnsupportedMediaTypeEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`content_type`](UnsupportedMediaTypeEncodedBuilder::content_type)
    pub fn build(self) -> Result<UnsupportedMediaTypeEncoded, BuildError> {
        Ok(UnsupportedMediaTypeEncoded {
            content_type: self
                .content_type
                .ok_or_else(|| BuildError::missing_field("content_type"))?,
        })
    }
}
