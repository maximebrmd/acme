pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct NewComment {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anchor: Option<NewCommentAnchor>,
    #[serde(rename = "parentId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub text: String,
}

impl NewComment {
    pub fn builder() -> NewCommentBuilder {
        <NewCommentBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewCommentBuilder {
    anchor: Option<NewCommentAnchor>,
    parent_id: Option<String>,
    text: Option<String>,
}

impl NewCommentBuilder {
    pub fn anchor(mut self, value: NewCommentAnchor) -> Self {
        self.anchor = Some(value);
        self
    }

    pub fn parent_id(mut self, value: impl Into<String>) -> Self {
        self.parent_id = Some(value.into());
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`NewComment`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](NewCommentBuilder::text)
    pub fn build(self) -> Result<NewComment, BuildError> {
        Ok(NewComment {
            anchor: self.anchor,
            parent_id: self.parent_id,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
