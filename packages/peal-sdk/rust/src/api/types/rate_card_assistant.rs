pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardAssistant {
    #[serde(default)]
    pub margin: i64,
}

impl RateCardAssistant {
    pub fn builder() -> RateCardAssistantBuilder {
        <RateCardAssistantBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardAssistantBuilder {
    margin: Option<i64>,
}

impl RateCardAssistantBuilder {
    pub fn margin(mut self, value: i64) -> Self {
        self.margin = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCardAssistant`].
    /// This method will fail if any of the following fields are not set:
    /// - [`margin`](RateCardAssistantBuilder::margin)
    pub fn build(self) -> Result<RateCardAssistant, BuildError> {
        Ok(RateCardAssistant {
            margin: self
                .margin
                .ok_or_else(|| BuildError::missing_field("margin"))?,
        })
    }
}
