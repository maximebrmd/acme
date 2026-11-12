pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingResume {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<RecyclingVariant>>,
}

impl RecyclingResume {
    pub fn builder() -> RecyclingResumeBuilder {
        <RecyclingResumeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingResumeBuilder {
    variants: Option<Vec<RecyclingVariant>>,
}

impl RecyclingResumeBuilder {
    pub fn variants(mut self, value: Vec<RecyclingVariant>) -> Self {
        self.variants = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingResume`].
    pub fn build(self) -> Result<RecyclingResume, BuildError> {
        Ok(RecyclingResume {
            variants: self.variants,
        })
    }
}
