pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PostNotRecyclableEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    pub reason: NotRecyclableReason,
}

impl PostNotRecyclableEncoded {
    pub fn builder() -> PostNotRecyclableEncodedBuilder {
        <PostNotRecyclableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostNotRecyclableEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    post_id: Option<String>,
    reason: Option<NotRecyclableReason>,
}

impl PostNotRecyclableEncodedBuilder {
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

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn reason(mut self, value: NotRecyclableReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostNotRecyclableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`post_id`](PostNotRecyclableEncodedBuilder::post_id)
    /// - [`reason`](PostNotRecyclableEncodedBuilder::reason)
    pub fn build(self) -> Result<PostNotRecyclableEncoded, BuildError> {
        Ok(PostNotRecyclableEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
