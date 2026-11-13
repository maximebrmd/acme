pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RateCardApiRequestsPerMinute {
    #[serde(rename = "onRequest")]
    #[serde(default)]
    pub on_request: i64,
    #[serde(rename = "withoutPaymentMethod")]
    #[serde(default)]
    pub without_payment_method: i64,
}

impl RateCardApiRequestsPerMinute {
    pub fn builder() -> RateCardApiRequestsPerMinuteBuilder {
        <RateCardApiRequestsPerMinuteBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RateCardApiRequestsPerMinuteBuilder {
    on_request: Option<i64>,
    without_payment_method: Option<i64>,
}

impl RateCardApiRequestsPerMinuteBuilder {
    pub fn on_request(mut self, value: i64) -> Self {
        self.on_request = Some(value);
        self
    }

    pub fn without_payment_method(mut self, value: i64) -> Self {
        self.without_payment_method = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RateCardApiRequestsPerMinute`].
    /// This method will fail if any of the following fields are not set:
    /// - [`on_request`](RateCardApiRequestsPerMinuteBuilder::on_request)
    /// - [`without_payment_method`](RateCardApiRequestsPerMinuteBuilder::without_payment_method)
    pub fn build(self) -> Result<RateCardApiRequestsPerMinute, BuildError> {
        Ok(RateCardApiRequestsPerMinute {
            on_request: self
                .on_request
                .ok_or_else(|| BuildError::missing_field("on_request"))?,
            without_payment_method: self
                .without_payment_method
                .ok_or_else(|| BuildError::missing_field("without_payment_method"))?,
        })
    }
}
