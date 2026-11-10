pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PinterestBoardSection {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
}

impl PinterestBoardSection {
    pub fn builder() -> PinterestBoardSectionBuilder {
        <PinterestBoardSectionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PinterestBoardSectionBuilder {
    id: Option<String>,
    name: Option<String>,
}

impl PinterestBoardSectionBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PinterestBoardSection`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](PinterestBoardSectionBuilder::id)
    /// - [`name`](PinterestBoardSectionBuilder::name)
    pub fn build(self) -> Result<PinterestBoardSection, BuildError> {
        Ok(PinterestBoardSection {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
