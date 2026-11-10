pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PostNotPromotableEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub reason: PostNotPromotableEncodedReason,
}

impl PostNotPromotableEncoded {
    pub fn builder() -> PostNotPromotableEncodedBuilder {
        <PostNotPromotableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostNotPromotableEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    reason: Option<PostNotPromotableEncodedReason>,
}

impl PostNotPromotableEncodedBuilder {
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

    pub fn reason(mut self, value: PostNotPromotableEncodedReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostNotPromotableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`reason`](PostNotPromotableEncodedBuilder::reason)
    pub fn build(self) -> Result<PostNotPromotableEncoded, BuildError> {
        Ok(PostNotPromotableEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
