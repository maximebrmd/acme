pub use crate::prelude::*;

/// Who a boost is shown to: people in some countries (ISO 3166-1 alpha-2 codes in capitals, 25 at most), between two ages (18 to 65, 65 meaning "65 and over"). Nothing finer.
#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BoostAudience {
    #[serde(rename = "ageMax")]
    #[serde(default)]
    pub age_max: i64,
    #[serde(rename = "ageMin")]
    #[serde(default)]
    pub age_min: i64,
    #[serde(default)]
    pub countries: Vec<String>,
}

impl BoostAudience {
    pub fn builder() -> BoostAudienceBuilder {
        <BoostAudienceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostAudienceBuilder {
    age_max: Option<i64>,
    age_min: Option<i64>,
    countries: Option<Vec<String>>,
}

impl BoostAudienceBuilder {
    pub fn age_max(mut self, value: i64) -> Self {
        self.age_max = Some(value);
        self
    }

    pub fn age_min(mut self, value: i64) -> Self {
        self.age_min = Some(value);
        self
    }

    pub fn countries(mut self, value: Vec<String>) -> Self {
        self.countries = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BoostAudience`].
    /// This method will fail if any of the following fields are not set:
    /// - [`age_max`](BoostAudienceBuilder::age_max)
    /// - [`age_min`](BoostAudienceBuilder::age_min)
    /// - [`countries`](BoostAudienceBuilder::countries)
    pub fn build(self) -> Result<BoostAudience, BuildError> {
        Ok(BoostAudience {
            age_max: self
                .age_max
                .ok_or_else(|| BuildError::missing_field("age_max"))?,
            age_min: self
                .age_min
                .ok_or_else(|| BuildError::missing_field("age_min"))?,
            countries: self
                .countries
                .ok_or_else(|| BuildError::missing_field("countries"))?,
        })
    }
}
