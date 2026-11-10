pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdsStatus {
    pub mode: AdsMode,
    #[serde(default)]
    pub networks: Vec<AdNetwork>,
}

impl AdsStatus {
    pub fn builder() -> AdsStatusBuilder {
        <AdsStatusBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdsStatusBuilder {
    mode: Option<AdsMode>,
    networks: Option<Vec<AdNetwork>>,
}

impl AdsStatusBuilder {
    pub fn mode(mut self, value: AdsMode) -> Self {
        self.mode = Some(value);
        self
    }

    pub fn networks(mut self, value: Vec<AdNetwork>) -> Self {
        self.networks = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdsStatus`].
    /// This method will fail if any of the following fields are not set:
    /// - [`mode`](AdsStatusBuilder::mode)
    /// - [`networks`](AdsStatusBuilder::networks)
    pub fn build(self) -> Result<AdsStatus, BuildError> {
        Ok(AdsStatus {
            mode: self.mode.ok_or_else(|| BuildError::missing_field("mode"))?,
            networks: self
                .networks
                .ok_or_else(|| BuildError::missing_field("networks"))?,
        })
    }
}
