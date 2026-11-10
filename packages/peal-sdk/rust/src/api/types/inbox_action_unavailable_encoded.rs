pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxActionUnavailableEncoded {
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
    ability: Option<String>,
    standing: Option<InboxActionUnavailableEncodedStanding>,
}

impl InboxActionUnavailableEncodedBuilder {
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
            ability: self
                .ability
                .ok_or_else(|| BuildError::missing_field("ability"))?,
            standing: self
                .standing
                .ok_or_else(|| BuildError::missing_field("standing"))?,
        })
    }
}
