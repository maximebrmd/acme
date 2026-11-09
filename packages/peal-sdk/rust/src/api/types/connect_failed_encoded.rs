pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ConnectFailedEncoded {
    #[serde(rename = "_tag")]
    pub tag: ConnectFailedEncodedTag,
    pub reason: ConnectFailureReason,
}

impl ConnectFailedEncoded {
    pub fn builder() -> ConnectFailedEncodedBuilder {
        <ConnectFailedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConnectFailedEncodedBuilder {
    tag: Option<ConnectFailedEncodedTag>,
    reason: Option<ConnectFailureReason>,
}

impl ConnectFailedEncodedBuilder {
    pub fn tag(mut self, value: ConnectFailedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn reason(mut self, value: ConnectFailureReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ConnectFailedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ConnectFailedEncodedBuilder::tag)
    /// - [`reason`](ConnectFailedEncodedBuilder::reason)
    pub fn build(self) -> Result<ConnectFailedEncoded, BuildError> {
        Ok(ConnectFailedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
