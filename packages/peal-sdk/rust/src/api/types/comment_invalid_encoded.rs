pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CommentInvalidEncoded {
    #[serde(rename = "_tag")]
    pub tag: CommentInvalidEncodedTag,
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
    problem: Option<CommentProblem>,
}

impl CommentInvalidEncodedBuilder {
    pub fn tag(mut self, value: CommentInvalidEncodedTag) -> Self {
        self.tag = Some(value);
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
            problem: self
                .problem
                .ok_or_else(|| BuildError::missing_field("problem"))?,
        })
    }
}
