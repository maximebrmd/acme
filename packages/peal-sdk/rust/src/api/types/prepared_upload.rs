pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct PreparedUpload {
    pub media: Media,
    pub upload: UploadTarget,
}

impl PreparedUpload {
    pub fn builder() -> PreparedUploadBuilder {
        <PreparedUploadBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PreparedUploadBuilder {
    media: Option<Media>,
    upload: Option<UploadTarget>,
}

impl PreparedUploadBuilder {
    pub fn media(mut self, value: Media) -> Self {
        self.media = Some(value);
        self
    }

    pub fn upload(mut self, value: UploadTarget) -> Self {
        self.upload = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PreparedUpload`].
    /// This method will fail if any of the following fields are not set:
    /// - [`media`](PreparedUploadBuilder::media)
    /// - [`upload`](PreparedUploadBuilder::upload)
    pub fn build(self) -> Result<PreparedUpload, BuildError> {
        Ok(PreparedUpload {
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            upload: self
                .upload
                .ok_or_else(|| BuildError::missing_field("upload"))?,
        })
    }
}
