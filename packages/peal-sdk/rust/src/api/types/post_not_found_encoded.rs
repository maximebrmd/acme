pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostNotFoundEncoded {}

impl PostNotFoundEncoded {
    pub fn builder() -> PostNotFoundEncodedBuilder {
        <PostNotFoundEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostNotFoundEncodedBuilder {}

impl PostNotFoundEncodedBuilder {
    /// Consumes the builder and constructs a [`PostNotFoundEncoded`].
    pub fn build(self) -> Result<PostNotFoundEncoded, BuildError> {
        Ok(PostNotFoundEncoded {})
    }
}
