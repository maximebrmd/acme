pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Reviewer {
    pub kind: ReviewerKind,
    #[serde(rename = "linkId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub link_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(rename = "userId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<String>,
}

impl Reviewer {
    pub fn builder() -> ReviewerBuilder {
        <ReviewerBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewerBuilder {
    kind: Option<ReviewerKind>,
    link_id: Option<String>,
    name: Option<String>,
    user_id: Option<String>,
}

impl ReviewerBuilder {
    pub fn kind(mut self, value: ReviewerKind) -> Self {
        self.kind = Some(value);
        self
    }

    pub fn link_id(mut self, value: impl Into<String>) -> Self {
        self.link_id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn user_id(mut self, value: impl Into<String>) -> Self {
        self.user_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Reviewer`].
    /// This method will fail if any of the following fields are not set:
    /// - [`kind`](ReviewerBuilder::kind)
    pub fn build(self) -> Result<Reviewer, BuildError> {
        Ok(Reviewer {
            kind: self.kind.ok_or_else(|| BuildError::missing_field("kind"))?,
            link_id: self.link_id,
            name: self.name,
            user_id: self.user_id,
        })
    }
}
