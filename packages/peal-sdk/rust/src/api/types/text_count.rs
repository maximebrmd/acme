pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TextCount {
    #[serde(default)]
    pub length: i64,
    #[serde(default)]
    pub maximum: i64,
    pub unit: TextUnit,
}

impl TextCount {
    pub fn builder() -> TextCountBuilder {
        <TextCountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TextCountBuilder {
    length: Option<i64>,
    maximum: Option<i64>,
    unit: Option<TextUnit>,
}

impl TextCountBuilder {
    pub fn length(mut self, value: i64) -> Self {
        self.length = Some(value);
        self
    }

    pub fn maximum(mut self, value: i64) -> Self {
        self.maximum = Some(value);
        self
    }

    pub fn unit(mut self, value: TextUnit) -> Self {
        self.unit = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TextCount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`length`](TextCountBuilder::length)
    /// - [`maximum`](TextCountBuilder::maximum)
    /// - [`unit`](TextCountBuilder::unit)
    pub fn build(self) -> Result<TextCount, BuildError> {
        Ok(TextCount {
            length: self
                .length
                .ok_or_else(|| BuildError::missing_field("length"))?,
            maximum: self
                .maximum
                .ok_or_else(|| BuildError::missing_field("maximum"))?,
            unit: self.unit.ok_or_else(|| BuildError::missing_field("unit"))?,
        })
    }
}
