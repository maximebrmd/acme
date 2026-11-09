pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaDimensions {
    #[serde(default)]
    pub height: i64,
    #[serde(default)]
    pub width: i64,
}

impl MediaDimensions {
    pub fn builder() -> MediaDimensionsBuilder {
        <MediaDimensionsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaDimensionsBuilder {
    height: Option<i64>,
    width: Option<i64>,
}

impl MediaDimensionsBuilder {
    pub fn height(mut self, value: i64) -> Self {
        self.height = Some(value);
        self
    }

    pub fn width(mut self, value: i64) -> Self {
        self.width = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaDimensions`].
    /// This method will fail if any of the following fields are not set:
    /// - [`height`](MediaDimensionsBuilder::height)
    /// - [`width`](MediaDimensionsBuilder::width)
    pub fn build(self) -> Result<MediaDimensions, BuildError> {
        Ok(MediaDimensions {
            height: self
                .height
                .ok_or_else(|| BuildError::missing_field("height"))?,
            width: self
                .width
                .ok_or_else(|| BuildError::missing_field("width"))?,
        })
    }
}
