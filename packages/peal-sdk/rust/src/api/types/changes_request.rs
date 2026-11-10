pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChangesRequest {
    #[serde(rename = "approvalId")]
    #[serde(default)]
    pub approval_id: String,
    #[serde(rename = "subjectHash")]
    #[serde(default)]
    pub subject_hash: String,
    #[serde(default)]
    pub comment: String,
}

impl ChangesRequest {
    pub fn builder() -> ChangesRequestBuilder {
        <ChangesRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChangesRequestBuilder {
    approval_id: Option<String>,
    subject_hash: Option<String>,
    comment: Option<String>,
}

impl ChangesRequestBuilder {
    pub fn approval_id(mut self, value: impl Into<String>) -> Self {
        self.approval_id = Some(value.into());
        self
    }

    pub fn subject_hash(mut self, value: impl Into<String>) -> Self {
        self.subject_hash = Some(value.into());
        self
    }

    pub fn comment(mut self, value: impl Into<String>) -> Self {
        self.comment = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChangesRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`approval_id`](ChangesRequestBuilder::approval_id)
    /// - [`subject_hash`](ChangesRequestBuilder::subject_hash)
    /// - [`comment`](ChangesRequestBuilder::comment)
    pub fn build(self) -> Result<ChangesRequest, BuildError> {
        Ok(ChangesRequest {
            approval_id: self
                .approval_id
                .ok_or_else(|| BuildError::missing_field("approval_id"))?,
            subject_hash: self
                .subject_hash
                .ok_or_else(|| BuildError::missing_field("subject_hash"))?,
            comment: self
                .comment
                .ok_or_else(|| BuildError::missing_field("comment"))?,
        })
    }
}
