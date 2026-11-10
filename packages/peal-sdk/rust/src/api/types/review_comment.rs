pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ReviewComment {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub anchor: Option<CommentAnchor>,
    pub author: Reviewer,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "parentId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent_id: Option<String>,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resolved: Option<ReviewCommentResolved>,
    #[serde(default)]
    pub text: String,
}

impl ReviewComment {
    pub fn builder() -> ReviewCommentBuilder {
        <ReviewCommentBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewCommentBuilder {
    anchor: Option<CommentAnchor>,
    author: Option<Reviewer>,
    created_at: Option<String>,
    id: Option<String>,
    parent_id: Option<String>,
    post_id: Option<String>,
    resolved: Option<ReviewCommentResolved>,
    text: Option<String>,
}

impl ReviewCommentBuilder {
    pub fn anchor(mut self, value: CommentAnchor) -> Self {
        self.anchor = Some(value);
        self
    }

    pub fn author(mut self, value: Reviewer) -> Self {
        self.author = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn parent_id(mut self, value: impl Into<String>) -> Self {
        self.parent_id = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn resolved(mut self, value: ReviewCommentResolved) -> Self {
        self.resolved = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReviewComment`].
    /// This method will fail if any of the following fields are not set:
    /// - [`author`](ReviewCommentBuilder::author)
    /// - [`created_at`](ReviewCommentBuilder::created_at)
    /// - [`id`](ReviewCommentBuilder::id)
    /// - [`post_id`](ReviewCommentBuilder::post_id)
    /// - [`text`](ReviewCommentBuilder::text)
    pub fn build(self) -> Result<ReviewComment, BuildError> {
        Ok(ReviewComment {
            anchor: self.anchor,
            author: self
                .author
                .ok_or_else(|| BuildError::missing_field("author"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            parent_id: self.parent_id,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            resolved: self.resolved,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
