pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PostNotReviewableEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub status: PostNotReviewableEncodedStatus,
}

impl PostNotReviewableEncoded {
    pub fn builder() -> PostNotReviewableEncodedBuilder {
        <PostNotReviewableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostNotReviewableEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    status: Option<PostNotReviewableEncodedStatus>,
}

impl PostNotReviewableEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn status(mut self, value: PostNotReviewableEncodedStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostNotReviewableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`status`](PostNotReviewableEncodedBuilder::status)
    pub fn build(self) -> Result<PostNotReviewableEncoded, BuildError> {
        Ok(PostNotReviewableEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
