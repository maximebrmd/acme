pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ConnectablePlatforms {
    #[serde(default)]
    pub platforms: Vec<Platform>,
}

impl ConnectablePlatforms {
    pub fn builder() -> ConnectablePlatformsBuilder {
        <ConnectablePlatformsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ConnectablePlatformsBuilder {
    platforms: Option<Vec<Platform>>,
}

impl ConnectablePlatformsBuilder {
    pub fn platforms(mut self, value: Vec<Platform>) -> Self {
        self.platforms = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ConnectablePlatforms`].
    /// This method will fail if any of the following fields are not set:
    /// - [`platforms`](ConnectablePlatformsBuilder::platforms)
    pub fn build(self) -> Result<ConnectablePlatforms, BuildError> {
        Ok(ConnectablePlatforms {
            platforms: self
                .platforms
                .ok_or_else(|| BuildError::missing_field("platforms"))?,
        })
    }
}
