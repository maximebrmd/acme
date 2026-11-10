pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ConnectablePlatforms {
    #[serde(rename = "instagramConnections")]
    #[serde(default)]
    pub instagram_connections: Vec<InstagramConnection>,
    #[serde(rename = "linkedinConnections")]
    #[serde(default)]
    pub linkedin_connections: Vec<LinkedInConnection>,
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
    instagram_connections: Option<Vec<InstagramConnection>>,
    linkedin_connections: Option<Vec<LinkedInConnection>>,
    platforms: Option<Vec<Platform>>,
}

impl ConnectablePlatformsBuilder {
    pub fn instagram_connections(mut self, value: Vec<InstagramConnection>) -> Self {
        self.instagram_connections = Some(value);
        self
    }

    pub fn linkedin_connections(mut self, value: Vec<LinkedInConnection>) -> Self {
        self.linkedin_connections = Some(value);
        self
    }

    pub fn platforms(mut self, value: Vec<Platform>) -> Self {
        self.platforms = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ConnectablePlatforms`].
    /// This method will fail if any of the following fields are not set:
    /// - [`instagram_connections`](ConnectablePlatformsBuilder::instagram_connections)
    /// - [`linkedin_connections`](ConnectablePlatformsBuilder::linkedin_connections)
    /// - [`platforms`](ConnectablePlatformsBuilder::platforms)
    pub fn build(self) -> Result<ConnectablePlatforms, BuildError> {
        Ok(ConnectablePlatforms {
            instagram_connections: self
                .instagram_connections
                .ok_or_else(|| BuildError::missing_field("instagram_connections"))?,
            linkedin_connections: self
                .linkedin_connections
                .ok_or_else(|| BuildError::missing_field("linkedin_connections"))?,
            platforms: self
                .platforms
                .ok_or_else(|| BuildError::missing_field("platforms"))?,
        })
    }
}
