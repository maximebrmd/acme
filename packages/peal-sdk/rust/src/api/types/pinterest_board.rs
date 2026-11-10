pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PinterestBoard {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub privacy: Option<String>,
}

impl PinterestBoard {
    pub fn builder() -> PinterestBoardBuilder {
        <PinterestBoardBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PinterestBoardBuilder {
    id: Option<String>,
    name: Option<String>,
    privacy: Option<String>,
}

impl PinterestBoardBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn privacy(mut self, value: impl Into<String>) -> Self {
        self.privacy = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`PinterestBoard`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](PinterestBoardBuilder::id)
    /// - [`name`](PinterestBoardBuilder::name)
    pub fn build(self) -> Result<PinterestBoard, BuildError> {
        Ok(PinterestBoard {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            privacy: self.privacy,
        })
    }
}
