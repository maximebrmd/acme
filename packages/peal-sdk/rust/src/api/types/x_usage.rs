pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct XUsage {
    #[serde(default)]
    pub reads: bool,
    #[serde(rename = "setAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub set_at: Option<String>,
}

impl XUsage {
    pub fn builder() -> XUsageBuilder {
        <XUsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct XUsageBuilder {
    reads: Option<bool>,
    set_at: Option<String>,
}

impl XUsageBuilder {
    pub fn reads(mut self, value: bool) -> Self {
        self.reads = Some(value);
        self
    }

    pub fn set_at(mut self, value: impl Into<String>) -> Self {
        self.set_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`XUsage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`reads`](XUsageBuilder::reads)
    pub fn build(self) -> Result<XUsage, BuildError> {
        Ok(XUsage {
            reads: self
                .reads
                .ok_or_else(|| BuildError::missing_field("reads"))?,
            set_at: self.set_at,
        })
    }
}
