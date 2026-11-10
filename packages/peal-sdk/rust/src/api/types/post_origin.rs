pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PostOrigin {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    pub via: PostOriginVia,
}

impl PostOrigin {
    pub fn builder() -> PostOriginBuilder {
        <PostOriginBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostOriginBuilder {
    id: Option<String>,
    name: Option<String>,
    via: Option<PostOriginVia>,
}

impl PostOriginBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn via(mut self, value: PostOriginVia) -> Self {
        self.via = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostOrigin`].
    /// This method will fail if any of the following fields are not set:
    /// - [`via`](PostOriginBuilder::via)
    pub fn build(self) -> Result<PostOrigin, BuildError> {
        Ok(PostOrigin {
            id: self.id,
            name: self.name,
            via: self.via.ok_or_else(|| BuildError::missing_field("via"))?,
        })
    }
}
