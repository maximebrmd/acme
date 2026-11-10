pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ImportUnreadableEncoded {
    #[serde(rename = "_tag")]
    pub tag: ImportUnreadableEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub column: Option<String>,
    pub problem: ImportProblem,
}

impl ImportUnreadableEncoded {
    pub fn builder() -> ImportUnreadableEncodedBuilder {
        <ImportUnreadableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImportUnreadableEncodedBuilder {
    tag: Option<ImportUnreadableEncodedTag>,
    column: Option<String>,
    problem: Option<ImportProblem>,
}

impl ImportUnreadableEncodedBuilder {
    pub fn tag(mut self, value: ImportUnreadableEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn column(mut self, value: impl Into<String>) -> Self {
        self.column = Some(value.into());
        self
    }

    pub fn problem(mut self, value: ImportProblem) -> Self {
        self.problem = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ImportUnreadableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ImportUnreadableEncodedBuilder::tag)
    /// - [`problem`](ImportUnreadableEncodedBuilder::problem)
    pub fn build(self) -> Result<ImportUnreadableEncoded, BuildError> {
        Ok(ImportUnreadableEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            column: self.column,
            problem: self
                .problem
                .ok_or_else(|| BuildError::missing_field("problem"))?,
        })
    }
}
