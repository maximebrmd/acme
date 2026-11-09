pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NoticeChannel {
    #[serde(default)]
    pub handle: String,
    pub platform: Platform,
}

impl NoticeChannel {
    pub fn builder() -> NoticeChannelBuilder {
        <NoticeChannelBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NoticeChannelBuilder {
    handle: Option<String>,
    platform: Option<Platform>,
}

impl NoticeChannelBuilder {
    pub fn handle(mut self, value: impl Into<String>) -> Self {
        self.handle = Some(value.into());
        self
    }

    pub fn platform(mut self, value: Platform) -> Self {
        self.platform = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NoticeChannel`].
    /// This method will fail if any of the following fields are not set:
    /// - [`handle`](NoticeChannelBuilder::handle)
    /// - [`platform`](NoticeChannelBuilder::platform)
    pub fn build(self) -> Result<NoticeChannel, BuildError> {
        Ok(NoticeChannel {
            handle: self
                .handle
                .ok_or_else(|| BuildError::missing_field("handle"))?,
            platform: self
                .platform
                .ok_or_else(|| BuildError::missing_field("platform"))?,
        })
    }
}
