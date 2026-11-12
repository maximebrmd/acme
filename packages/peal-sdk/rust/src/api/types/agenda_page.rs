pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AgendaPage {
    #[serde(default)]
    pub items: Vec<AgendaItem>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl AgendaPage {
    pub fn builder() -> AgendaPageBuilder {
        <AgendaPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AgendaPageBuilder {
    items: Option<Vec<AgendaItem>>,
    next_cursor: Option<String>,
}

impl AgendaPageBuilder {
    pub fn items(mut self, value: Vec<AgendaItem>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AgendaPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](AgendaPageBuilder::items)
    pub fn build(self) -> Result<AgendaPage, BuildError> {
        Ok(AgendaPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
