pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostAdPerformance {
    #[serde(default)]
    pub boosts: Vec<Boost>,
    #[serde(default)]
    pub organic: Vec<OrganicCounts>,
    #[serde(default)]
    pub paid: Vec<PostAdPerformancePaidItem>,
}

impl PostAdPerformance {
    pub fn builder() -> PostAdPerformanceBuilder {
        <PostAdPerformanceBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostAdPerformanceBuilder {
    boosts: Option<Vec<Boost>>,
    organic: Option<Vec<OrganicCounts>>,
    paid: Option<Vec<PostAdPerformancePaidItem>>,
}

impl PostAdPerformanceBuilder {
    pub fn boosts(mut self, value: Vec<Boost>) -> Self {
        self.boosts = Some(value);
        self
    }

    pub fn organic(mut self, value: Vec<OrganicCounts>) -> Self {
        self.organic = Some(value);
        self
    }

    pub fn paid(mut self, value: Vec<PostAdPerformancePaidItem>) -> Self {
        self.paid = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostAdPerformance`].
    /// This method will fail if any of the following fields are not set:
    /// - [`boosts`](PostAdPerformanceBuilder::boosts)
    /// - [`organic`](PostAdPerformanceBuilder::organic)
    /// - [`paid`](PostAdPerformanceBuilder::paid)
    pub fn build(self) -> Result<PostAdPerformance, BuildError> {
        Ok(PostAdPerformance {
            boosts: self
                .boosts
                .ok_or_else(|| BuildError::missing_field("boosts"))?,
            organic: self
                .organic
                .ok_or_else(|| BuildError::missing_field("organic"))?,
            paid: self.paid.ok_or_else(|| BuildError::missing_field("paid"))?,
        })
    }
}
