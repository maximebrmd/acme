pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BoostPage {
    #[serde(default)]
    pub boosts: Vec<Boost>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl BoostPage {
    pub fn builder() -> BoostPageBuilder {
        <BoostPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostPageBuilder {
    boosts: Option<Vec<Boost>>,
    next_cursor: Option<String>,
}

impl BoostPageBuilder {
    pub fn boosts(mut self, value: Vec<Boost>) -> Self {
        self.boosts = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BoostPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`boosts`](BoostPageBuilder::boosts)
    pub fn build(self) -> Result<BoostPage, BuildError> {
        Ok(BoostPage {
            boosts: self
                .boosts
                .ok_or_else(|| BuildError::missing_field("boosts"))?,
            next_cursor: self.next_cursor,
        })
    }
}
