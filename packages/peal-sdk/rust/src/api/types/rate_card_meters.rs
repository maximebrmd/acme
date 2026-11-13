pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardMeters {
    #[serde(rename = "assistantImages")]
    #[serde(default)]
    pub assistant_images: MeterTerms,
    #[serde(rename = "assistantRequests")]
    #[serde(default)]
    pub assistant_requests: MeterTerms,
    #[serde(rename = "managedAds")]
    #[serde(default)]
    pub managed_ads: MeterTerms,
    #[serde(rename = "outboundMessages")]
    #[serde(default)]
    pub outbound_messages: MeterTerms,
    #[serde(rename = "xApi")]
    #[serde(default)]
    pub x_api: MeterTerms,
}

impl RateCardMeters {
    pub fn builder() -> RateCardMetersBuilder {
        <RateCardMetersBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardMetersBuilder {
    assistant_images: Option<MeterTerms>,
    assistant_requests: Option<MeterTerms>,
    managed_ads: Option<MeterTerms>,
    outbound_messages: Option<MeterTerms>,
    x_api: Option<MeterTerms>,
}

impl RateCardMetersBuilder {
    pub fn assistant_images(mut self, value: MeterTerms) -> Self {
        self.assistant_images = Some(value);
        self
    }

    pub fn assistant_requests(mut self, value: MeterTerms) -> Self {
        self.assistant_requests = Some(value);
        self
    }

    pub fn managed_ads(mut self, value: MeterTerms) -> Self {
        self.managed_ads = Some(value);
        self
    }

    pub fn outbound_messages(mut self, value: MeterTerms) -> Self {
        self.outbound_messages = Some(value);
        self
    }

    pub fn x_api(mut self, value: MeterTerms) -> Self {
        self.x_api = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCardMeters`].
    /// This method will fail if any of the following fields are not set:
    /// - [`assistant_images`](RateCardMetersBuilder::assistant_images)
    /// - [`assistant_requests`](RateCardMetersBuilder::assistant_requests)
    /// - [`managed_ads`](RateCardMetersBuilder::managed_ads)
    /// - [`outbound_messages`](RateCardMetersBuilder::outbound_messages)
    /// - [`x_api`](RateCardMetersBuilder::x_api)
    pub fn build(self) -> Result<RateCardMeters, BuildError> {
        Ok(RateCardMeters {
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
