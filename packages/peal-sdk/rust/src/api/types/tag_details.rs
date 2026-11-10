pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TagDetails {
    pub colour: TagColour,
    #[serde(default)]
    pub name: String,
}

impl TagDetails {
    pub fn builder() -> TagDetailsBuilder {
        <TagDetailsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TagDetailsBuilder {
    colour: Option<TagColour>,
    name: Option<String>,
}

impl TagDetailsBuilder {
    pub fn colour(mut self, value: TagColour) -> Self {
        self.colour = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`TagDetails`].
    /// This method will fail if any of the following fields are not set:
    /// - [`colour`](TagDetailsBuilder::colour)
    /// - [`name`](TagDetailsBuilder::name)
    pub fn build(self) -> Result<TagDetails, BuildError> {
        Ok(TagDetails {
            colour: self
                .colour
                .ok_or_else(|| BuildError::missing_field("colour"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
