pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerOverview {
    #[serde(default)]
    pub partner: Partner,
    #[serde(default)]
    pub usage: PartnerUsage,
}

impl PartnerOverview {
    pub fn builder() -> PartnerOverviewBuilder {
        <PartnerOverviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerOverviewBuilder {
    partner: Option<Partner>,
    usage: Option<PartnerUsage>,
}

impl PartnerOverviewBuilder {
    pub fn partner(mut self, value: Partner) -> Self {
        self.partner = Some(value);
        self
    }

    pub fn usage(mut self, value: PartnerUsage) -> Self {
        self.usage = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerOverview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`partner`](PartnerOverviewBuilder::partner)
    /// - [`usage`](PartnerOverviewBuilder::usage)
    pub fn build(self) -> Result<PartnerOverview, BuildError> {
        Ok(PartnerOverview {
            partner: self
                .partner
                .ok_or_else(|| BuildError::missing_field("partner"))?,
            usage: self
                .usage
                .ok_or_else(|| BuildError::missing_field("usage"))?,
        })
    }
}
