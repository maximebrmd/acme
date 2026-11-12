pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ImageRequest {
    pub aspect: ImageAspect,
    #[serde(default)]
    pub prompt: String,
}

impl ImageRequest {
    pub fn builder() -> ImageRequestBuilder {
        <ImageRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ImageRequestBuilder {
    aspect: Option<ImageAspect>,
    prompt: Option<String>,
}

impl ImageRequestBuilder {
    pub fn aspect(mut self, value: ImageAspect) -> Self {
        self.aspect = Some(value);
        self
    }

    pub fn prompt(mut self, value: impl Into<String>) -> Self {
        self.prompt = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ImageRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`aspect`](ImageRequestBuilder::aspect)
    /// - [`prompt`](ImageRequestBuilder::prompt)
    pub fn build(self) -> Result<ImageRequest, BuildError> {
        Ok(ImageRequest {
            aspect: self
                .aspect
                .ok_or_else(|| BuildError::missing_field("aspect"))?,
            prompt: self
                .prompt
                .ok_or_else(|| BuildError::missing_field("prompt"))?,
        })
    }
}
