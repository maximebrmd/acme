pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct NewChannelDefaults {
    pub options: TargetOptions,
}

impl NewChannelDefaults {
    pub fn builder() -> NewChannelDefaultsBuilder {
        <NewChannelDefaultsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewChannelDefaultsBuilder {
    options: Option<TargetOptions>,
}

impl NewChannelDefaultsBuilder {
    pub fn options(mut self, value: TargetOptions) -> Self {
        self.options = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewChannelDefaults`].
    /// This method will fail if any of the following fields are not set:
    /// - [`options`](NewChannelDefaultsBuilder::options)
    pub fn build(self) -> Result<NewChannelDefaults, BuildError> {
        Ok(NewChannelDefaults {
            options: self
                .options
                .ok_or_else(|| BuildError::missing_field("options"))?,
        })
    }
}
