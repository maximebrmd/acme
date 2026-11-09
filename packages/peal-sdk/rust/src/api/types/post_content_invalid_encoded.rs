pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostContentInvalidEncoded {
    #[serde(default)]
    pub violations: Vec<ContentViolation>,
}

impl PostContentInvalidEncoded {
    pub fn builder() -> PostContentInvalidEncodedBuilder {
        <PostContentInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostContentInvalidEncodedBuilder {
    violations: Option<Vec<ContentViolation>>,
}

impl PostContentInvalidEncodedBuilder {
    pub fn violations(mut self, value: Vec<ContentViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostContentInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`violations`](PostContentInvalidEncodedBuilder::violations)
    pub fn build(self) -> Result<PostContentInvalidEncoded, BuildError> {
        Ok(PostContentInvalidEncoded {
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
        })
    }
}
