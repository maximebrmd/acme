pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ImportRowResultUnreadableCells {
    #[serde(default)]
    pub expected: i64,
    #[serde(default)]
    pub found: i64,
}

impl ImportRowResultUnreadableCells {
    pub fn builder() -> ImportRowResultUnreadableCellsBuilder {
        <ImportRowResultUnreadableCellsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImportRowResultUnreadableCellsBuilder {
    expected: Option<i64>,
    found: Option<i64>,
}

impl ImportRowResultUnreadableCellsBuilder {
    pub fn expected(mut self, value: i64) -> Self {
        self.expected = Some(value);
        self
    }

    pub fn found(mut self, value: i64) -> Self {
        self.found = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ImportRowResultUnreadableCells`].
    /// This method will fail if any of the following fields are not set:
    /// - [`expected`](ImportRowResultUnreadableCellsBuilder::expected)
    /// - [`found`](ImportRowResultUnreadableCellsBuilder::found)
    pub fn build(self) -> Result<ImportRowResultUnreadableCells, BuildError> {
        Ok(ImportRowResultUnreadableCells {
            expected: self
                .expected
                .ok_or_else(|| BuildError::missing_field("expected"))?,
            found: self
                .found
                .ok_or_else(|| BuildError::missing_field("found"))?,
        })
    }
}
