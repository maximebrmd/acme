pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct UnitPrice {
    #[serde(default)]
    pub cents: i64,
    #[serde(default)]
    pub per: i64,
}

impl UnitPrice {
    pub fn builder() -> UnitPriceBuilder {
        <UnitPriceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnitPriceBuilder {
    cents: Option<i64>,
    per: Option<i64>,
}

impl UnitPriceBuilder {
    pub fn cents(mut self, value: i64) -> Self {
        self.cents = Some(value);
        self
    }

    pub fn per(mut self, value: i64) -> Self {
        self.per = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UnitPrice`].
    /// This method will fail if any of the following fields are not set:
    /// - [`cents`](UnitPriceBuilder::cents)
    /// - [`per`](UnitPriceBuilder::per)
    pub fn build(self) -> Result<UnitPrice, BuildError> {
        Ok(UnitPrice {
            cents: self
                .cents
                .ok_or_else(|| BuildError::missing_field("cents"))?,
            per: self.per.ok_or_else(|| BuildError::missing_field("per"))?,
        })
    }
}
