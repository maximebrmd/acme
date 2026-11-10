pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Tag {
    pub colour: TagColour,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
}

impl Tag {
    pub fn builder() -> TagBuilder {
        <TagBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TagBuilder {
    colour: Option<TagColour>,
    created_at: Option<String>,
    id: Option<String>,
    name: Option<String>,
}

impl TagBuilder {
    pub fn colour(mut self, value: TagColour) -> Self {
        self.colour = Some(value);
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

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Tag`].
    /// This method will fail if any of the following fields are not set:
    /// - [`colour`](TagBuilder::colour)
    /// - [`created_at`](TagBuilder::created_at)
    /// - [`id`](TagBuilder::id)
    /// - [`name`](TagBuilder::name)
    pub fn build(self) -> Result<Tag, BuildError> {
        Ok(Tag {
            colour: self
                .colour
                .ok_or_else(|| BuildError::missing_field("colour"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
