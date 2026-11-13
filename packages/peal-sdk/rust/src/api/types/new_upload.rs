pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewUpload {
    #[serde(rename = "altText")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub alt_text: Option<String>,
    #[serde(rename = "byteSize")]
    #[serde(default)]
    pub byte_size: i64,
    #[serde(rename = "contentType")]
    #[serde(default)]
    pub content_type: String,
    #[serde(rename = "fileName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
}

impl NewUpload {
    pub fn builder() -> NewUploadBuilder {
        <NewUploadBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewUploadBuilder {
    alt_text: Option<String>,
    byte_size: Option<i64>,
    content_type: Option<String>,
    file_name: Option<String>,
}

impl NewUploadBuilder {
    pub fn alt_text(mut self, value: impl Into<String>) -> Self {
        self.alt_text = Some(value.into());
        self
    }

    pub fn byte_size(mut self, value: i64) -> Self {
        self.byte_size = Some(value);
        self
    }

    pub fn content_type(mut self, value: impl Into<String>) -> Self {
        self.content_type = Some(value.into());
        self
    }

    pub fn file_name(mut self, value: impl Into<String>) -> Self {
        self.file_name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewUpload`].
    /// This method will fail if any of the following fields are not set:
    /// - [`byte_size`](NewUploadBuilder::byte_size)
    /// - [`content_type`](NewUploadBuilder::content_type)
    pub fn build(self) -> Result<NewUpload, BuildError> {
        Ok(NewUpload {
            alt_text: self.alt_text,
            byte_size: self
                .byte_size
                .ok_or_else(|| BuildError::missing_field("byte_size"))?,
            content_type: self
                .content_type
                .ok_or_else(|| BuildError::missing_field("content_type"))?,
            file_name: self.file_name,
        })
    }
}
