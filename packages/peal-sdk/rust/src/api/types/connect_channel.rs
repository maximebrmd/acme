pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ConnectChannel {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub handle: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,
}

impl ConnectChannel {
    pub fn builder() -> ConnectChannelBuilder {
        <ConnectChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConnectChannelBuilder {
    handle: Option<String>,
    instance: Option<String>,
}

impl ConnectChannelBuilder {
    pub fn handle(mut self, value: impl Into<String>) -> Self {
        self.handle = Some(value.into());
        self
    }

    pub fn instance(mut self, value: impl Into<String>) -> Self {
        self.instance = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ConnectChannel`].
    pub fn build(self) -> Result<ConnectChannel, BuildError> {
        Ok(ConnectChannel {
            handle: self.handle,
            instance: self.instance,
        })
    }
}
