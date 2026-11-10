pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LookupInput {
    #[serde(rename = "boardId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub board_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cursor: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub limit: Option<i64>,
    #[serde(rename = "regionCode")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub region_code: Option<String>,
}

impl LookupInput {
    pub fn builder() -> LookupInputBuilder {
        <LookupInputBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LookupInputBuilder {
    board_id: Option<String>,
    cursor: Option<String>,
    language: Option<String>,
    limit: Option<i64>,
    region_code: Option<String>,
}

impl LookupInputBuilder {
    pub fn board_id(mut self, value: impl Into<String>) -> Self {
        self.board_id = Some(value.into());
        self
    }

    pub fn cursor(mut self, value: impl Into<String>) -> Self {
        self.cursor = Some(value.into());
        self
    }

    pub fn language(mut self, value: impl Into<String>) -> Self {
        self.language = Some(value.into());
        self
    }

    pub fn limit(mut self, value: i64) -> Self {
        self.limit = Some(value);
        self
    }

    pub fn region_code(mut self, value: impl Into<String>) -> Self {
        self.region_code = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LookupInput`].
    pub fn build(self) -> Result<LookupInput, BuildError> {
        Ok(LookupInput {
            board_id: self.board_id,
            cursor: self.cursor,
            language: self.language,
            limit: self.limit,
            region_code: self.region_code,
        })
    }
}
