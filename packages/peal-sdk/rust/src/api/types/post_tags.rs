pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PostTags {
    #[serde(rename = "tagIds")]
    #[serde(default)]
    pub tag_ids: Vec<String>,
}

impl PostTags {
    pub fn builder() -> PostTagsBuilder {
        <PostTagsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostTagsBuilder {
    tag_ids: Option<Vec<String>>,
}

impl PostTagsBuilder {
    pub fn tag_ids(mut self, value: Vec<String>) -> Self {
        self.tag_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostTags`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag_ids`](PostTagsBuilder::tag_ids)
    pub fn build(self) -> Result<PostTags, BuildError> {
        Ok(PostTags {
            tag_ids: self
                .tag_ids
                .ok_or_else(|| BuildError::missing_field("tag_ids"))?,
        })
    }
}
