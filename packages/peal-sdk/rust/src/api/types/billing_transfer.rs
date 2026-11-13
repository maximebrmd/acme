pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BillingTransfer {
    #[serde(rename = "expiresAt")]
    #[serde(default)]
    pub expires_at: String,
    #[serde(rename = "offeredAt")]
    #[serde(default)]
    pub offered_at: String,
    #[serde(rename = "offeredBy")]
    #[serde(default)]
    pub offered_by: String,
    #[serde(rename = "toUserId")]
    #[serde(default)]
    pub to_user_id: String,
}

impl BillingTransfer {
    pub fn builder() -> BillingTransferBuilder {
        <BillingTransferBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BillingTransferBuilder {
    expires_at: Option<String>,
    offered_at: Option<String>,
    offered_by: Option<String>,
    to_user_id: Option<String>,
}

impl BillingTransferBuilder {
    pub fn expires_at(mut self, value: impl Into<String>) -> Self {
        self.expires_at = Some(value.into());
        self
    }

    pub fn offered_at(mut self, value: impl Into<String>) -> Self {
        self.offered_at = Some(value.into());
        self
    }

    pub fn offered_by(mut self, value: impl Into<String>) -> Self {
        self.offered_by = Some(value.into());
        self
    }

    pub fn to_user_id(mut self, value: impl Into<String>) -> Self {
        self.to_user_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BillingTransfer`].
    /// This method will fail if any of the following fields are not set:
    /// - [`expires_at`](BillingTransferBuilder::expires_at)
    /// - [`offered_at`](BillingTransferBuilder::offered_at)
    /// - [`offered_by`](BillingTransferBuilder::offered_by)
    /// - [`to_user_id`](BillingTransferBuilder::to_user_id)
    pub fn build(self) -> Result<BillingTransfer, BuildError> {
        Ok(BillingTransfer {
            expires_at: self
                .expires_at
                .ok_or_else(|| BuildError::missing_field("expires_at"))?,
            offered_at: self
                .offered_at
                .ok_or_else(|| BuildError::missing_field("offered_at"))?,
            offered_by: self
                .offered_by
                .ok_or_else(|| BuildError::missing_field("offered_by"))?,
            to_user_id: self
                .to_user_id
                .ok_or_else(|| BuildError::missing_field("to_user_id"))?,
        })
    }
}
