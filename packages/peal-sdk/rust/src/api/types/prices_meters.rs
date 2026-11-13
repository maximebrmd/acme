pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PricesMeters {
    #[serde(rename = "assistantImages")]
    #[serde(default)]
    pub assistant_images: UnitPrice,
    #[serde(rename = "assistantRequests")]
    #[serde(default)]
    pub assistant_requests: UnitPrice,
    #[serde(rename = "managedAds")]
    #[serde(default)]
    pub managed_ads: UnitPrice,
    #[serde(rename = "outboundMessages")]
    #[serde(default)]
    pub outbound_messages: UnitPrice,
    #[serde(rename = "xApi")]
    #[serde(default)]
    pub x_api: UnitPrice,
}

impl PricesMeters {
    pub fn builder() -> PricesMetersBuilder {
        <PricesMetersBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PricesMetersBuilder {
    assistant_images: Option<UnitPrice>,
    assistant_requests: Option<UnitPrice>,
    managed_ads: Option<UnitPrice>,
    outbound_messages: Option<UnitPrice>,
    x_api: Option<UnitPrice>,
}

impl PricesMetersBuilder {
    pub fn assistant_images(mut self, value: UnitPrice) -> Self {
        self.assistant_images = Some(value);
        self
    }

    pub fn assistant_requests(mut self, value: UnitPrice) -> Self {
        self.assistant_requests = Some(value);
        self
    }

    pub fn managed_ads(mut self, value: UnitPrice) -> Self {
        self.managed_ads = Some(value);
        self
    }

    pub fn outbound_messages(mut self, value: UnitPrice) -> Self {
        self.outbound_messages = Some(value);
        self
    }

    pub fn x_api(mut self, value: UnitPrice) -> Self {
        self.x_api = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PricesMeters`].
    /// This method will fail if any of the following fields are not set:
    /// - [`assistant_images`](PricesMetersBuilder::assistant_images)
    /// - [`assistant_requests`](PricesMetersBuilder::assistant_requests)
    /// - [`managed_ads`](PricesMetersBuilder::managed_ads)
    /// - [`outbound_messages`](PricesMetersBuilder::outbound_messages)
    /// - [`x_api`](PricesMetersBuilder::x_api)
    pub fn build(self) -> Result<PricesMeters, BuildError> {
        Ok(PricesMeters {
            assistant_images: self
                .assistant_images
                .ok_or_else(|| BuildError::missing_field("assistant_images"))?,
            assistant_requests: self
                .assistant_requests
                .ok_or_else(|| BuildError::missing_field("assistant_requests"))?,
            managed_ads: self
                .managed_ads
                .ok_or_else(|| BuildError::missing_field("managed_ads"))?,
            outbound_messages: self
                .outbound_messages
                .ok_or_else(|| BuildError::missing_field("outbound_messages"))?,
            x_api: self
                .x_api
                .ok_or_else(|| BuildError::missing_field("x_api"))?,
        })
    }
}
