pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MarkNoticesRead {
    #[serde(default)]
    pub ids: Vec<String>,
}

impl MarkNoticesRead {
    pub fn builder() -> MarkNoticesReadBuilder {
        <MarkNoticesReadBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MarkNoticesReadBuilder {
    ids: Option<Vec<String>>,
}

impl MarkNoticesReadBuilder {
    pub fn ids(mut self, value: Vec<String>) -> Self {
        self.ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MarkNoticesRead`].
    /// This method will fail if any of the following fields are not set:
    /// - [`ids`](MarkNoticesReadBuilder::ids)
    pub fn build(self) -> Result<MarkNoticesRead, BuildError> {
        Ok(MarkNoticesRead {
            ids: self.ids.ok_or_else(|| BuildError::missing_field("ids"))?,
        })
    }
}
