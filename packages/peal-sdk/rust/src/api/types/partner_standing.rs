pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerStanding {
    #[serde(rename = "canOpen")]
    #[serde(default)]
    pub can_open: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub partner: Option<Partner>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub usage: Option<PartnerUsage>,
}

impl PartnerStanding {
    pub fn builder() -> PartnerStandingBuilder {
        <PartnerStandingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerStandingBuilder {
    can_open: Option<bool>,
    partner: Option<Partner>,
    usage: Option<PartnerUsage>,
}

impl PartnerStandingBuilder {
    pub fn can_open(mut self, value: bool) -> Self {
        self.can_open = Some(value);
        self
    }

    pub fn partner(mut self, value: Partner) -> Self {
        self.partner = Some(value);
        self
    }

    pub fn usage(mut self, value: PartnerUsage) -> Self {
        self.usage = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerStanding`].
    /// This method will fail if any of the following fields are not set:
    /// - [`can_open`](PartnerStandingBuilder::can_open)
    pub fn build(self) -> Result<PartnerStanding, BuildError> {
        Ok(PartnerStanding {
            can_open: self
                .can_open
                .ok_or_else(|| BuildError::missing_field("can_open"))?,
            partner: self.partner,
            usage: self.usage,
        })
    }
}
