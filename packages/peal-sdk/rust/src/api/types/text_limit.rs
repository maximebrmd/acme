pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TextLimit {
    #[serde(default)]
    pub maximum: i64,
    pub unit: TextUnit,
}

impl TextLimit {
    pub fn builder() -> TextLimitBuilder {
        <TextLimitBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TextLimitBuilder {
    maximum: Option<i64>,
    unit: Option<TextUnit>,
}

impl TextLimitBuilder {
    pub fn maximum(mut self, value: i64) -> Self {
        self.maximum = Some(value);
        self
    }

    pub fn unit(mut self, value: TextUnit) -> Self {
        self.unit = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TextLimit`].
    /// This method will fail if any of the following fields are not set:
    /// - [`maximum`](TextLimitBuilder::maximum)
    /// - [`unit`](TextLimitBuilder::unit)
    pub fn build(self) -> Result<TextLimit, BuildError> {
        Ok(TextLimit {
            maximum: self
                .maximum
                .ok_or_else(|| BuildError::missing_field("maximum"))?,
            unit: self.unit.ok_or_else(|| BuildError::missing_field("unit"))?,
        })
    }
}
