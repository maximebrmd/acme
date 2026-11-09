pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PostStatusConflictEncoded {
    #[serde(rename = "_tag")]
    pub tag: PostStatusConflictEncodedTag,
    pub status: PostStatus,
}

impl PostStatusConflictEncoded {
    pub fn builder() -> PostStatusConflictEncodedBuilder {
        <PostStatusConflictEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostStatusConflictEncodedBuilder {
    tag: Option<PostStatusConflictEncodedTag>,
    status: Option<PostStatus>,
}

impl PostStatusConflictEncodedBuilder {
    pub fn tag(mut self, value: PostStatusConflictEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn status(mut self, value: PostStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostStatusConflictEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PostStatusConflictEncodedBuilder::tag)
    /// - [`status`](PostStatusConflictEncodedBuilder::status)
    pub fn build(self) -> Result<PostStatusConflictEncoded, BuildError> {
        Ok(PostStatusConflictEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
