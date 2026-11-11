pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LivePostEdit {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub part: Option<i64>,
    #[serde(default)]
    pub text: String,
    #[serde(skip)]
    pub wait: Option<String>,
}

impl LivePostEdit {
    pub fn builder() -> LivePostEditBuilder {
        <LivePostEditBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePostEditBuilder {
    part: Option<i64>,
    text: Option<String>,
    wait: Option<String>,
}

impl LivePostEditBuilder {
    pub fn part(mut self, value: i64) -> Self {
        self.part = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    pub fn wait(mut self, value: impl Into<String>) -> Self {
        self.wait = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LivePostEdit`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](LivePostEditBuilder::text)
    pub fn build(self) -> Result<LivePostEdit, BuildError> {
        Ok(LivePostEdit {
            part: self.part,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
            wait: self.wait,
        })
    }
}
