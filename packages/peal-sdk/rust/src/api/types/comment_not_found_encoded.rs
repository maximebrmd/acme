pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CommentNotFoundEncoded {}

impl CommentNotFoundEncoded {
    pub fn builder() -> CommentNotFoundEncodedBuilder {
        <CommentNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CommentNotFoundEncodedBuilder {}

impl CommentNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`CommentNotFoundEncoded`].
    pub fn build(self) -> Result<CommentNotFoundEncoded, BuildError> {
        Ok(CommentNotFoundEncoded {})
    }
}
