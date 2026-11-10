pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CommentInvalidEncoded {
    #[serde(rename = "_tag")]
    pub tag: CommentInvalidEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub problem: CommentProblem,
}

impl CommentInvalidEncoded {
    pub fn builder() -> CommentInvalidEncodedBuilder {
        <CommentInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentInvalidEncodedBuilder {
    tag: Option<CommentInvalidEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    problem: Option<CommentProblem>,
}

impl CommentInvalidEncodedBuilder {
    pub fn tag(mut self, value: CommentInvalidEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

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

    pub fn problem(mut self, value: CommentProblem) -> Self {
        self.problem = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CommentInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](CommentInvalidEncodedBuilder::tag)
    /// - [`problem`](CommentInvalidEncodedBuilder::problem)
    pub fn build(self) -> Result<CommentInvalidEncoded, BuildError> {
        Ok(CommentInvalidEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            problem: self
                .problem
                .ok_or_else(|| BuildError::missing_field("problem"))?,
        })
    }
}
