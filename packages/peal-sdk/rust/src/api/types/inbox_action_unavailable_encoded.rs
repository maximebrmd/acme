pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxActionUnavailableEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub ability: String,
    pub standing: InboxActionUnavailableEncodedStanding,
}

impl InboxActionUnavailableEncoded {
    pub fn builder() -> InboxActionUnavailableEncodedBuilder {
        <InboxActionUnavailableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxActionUnavailableEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    ability: Option<String>,
    standing: Option<InboxActionUnavailableEncodedStanding>,
}

impl InboxActionUnavailableEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn ability(mut self, value: impl Into<String>) -> Self {
        self.ability = Some(value.into());
        self
    }

    pub fn standing(mut self, value: InboxActionUnavailableEncodedStanding) -> Self {
        self.standing = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxActionUnavailableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`ability`](InboxActionUnavailableEncodedBuilder::ability)
    /// - [`standing`](InboxActionUnavailableEncodedBuilder::standing)
    pub fn build(self) -> Result<InboxActionUnavailableEncoded, BuildError> {
        Ok(InboxActionUnavailableEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            ability: self
                .ability
                .ok_or_else(|| BuildError::missing_field("ability"))?,
            standing: self
                .standing
                .ok_or_else(|| BuildError::missing_field("standing"))?,
        })
    }
}
