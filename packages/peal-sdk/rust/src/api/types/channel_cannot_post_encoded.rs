pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ChannelCannotPostEncoded {
    #[serde(rename = "_tag")]
    pub tag: ChannelCannotPostEncodedTag,
    pub reason: ChannelCannotPostEncodedReason,
}

impl ChannelCannotPostEncoded {
    pub fn builder() -> ChannelCannotPostEncodedBuilder {
        <ChannelCannotPostEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelCannotPostEncodedBuilder {
    tag: Option<ChannelCannotPostEncodedTag>,
    reason: Option<ChannelCannotPostEncodedReason>,
}

impl ChannelCannotPostEncodedBuilder {
    pub fn tag(mut self, value: ChannelCannotPostEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn reason(mut self, value: ChannelCannotPostEncodedReason) -> Self {
        self.reason = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelCannotPostEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ChannelCannotPostEncodedBuilder::tag)
    /// - [`reason`](ChannelCannotPostEncodedBuilder::reason)
    pub fn build(self) -> Result<ChannelCannotPostEncoded, BuildError> {
        Ok(ChannelCannotPostEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
