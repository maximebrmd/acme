pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AssistantUnavailableEncoded {
    #[serde(rename = "_tag")]
    pub tag: AssistantUnavailableEncodedTag,
}

impl AssistantUnavailableEncoded {
    pub fn builder() -> AssistantUnavailableEncodedBuilder {
        <AssistantUnavailableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantUnavailableEncodedBuilder {
    tag: Option<AssistantUnavailableEncodedTag>,
}

impl AssistantUnavailableEncodedBuilder {
    pub fn tag(mut self, value: AssistantUnavailableEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AssistantUnavailableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AssistantUnavailableEncodedBuilder::tag)
    pub fn build(self) -> Result<AssistantUnavailableEncoded, BuildError> {
        Ok(AssistantUnavailableEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
