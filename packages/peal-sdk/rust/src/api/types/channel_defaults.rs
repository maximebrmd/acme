pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ChannelDefaults {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<TargetOptions>,
}

impl ChannelDefaults {
    pub fn builder() -> ChannelDefaultsBuilder {
        <ChannelDefaultsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelDefaultsBuilder {
    options: Option<TargetOptions>,
}

impl ChannelDefaultsBuilder {
    pub fn options(mut self, value: TargetOptions) -> Self {
        self.options = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelDefaults`].
    pub fn build(self) -> Result<ChannelDefaults, BuildError> {
        Ok(ChannelDefaults {
            options: self.options,
        })
    }
}
