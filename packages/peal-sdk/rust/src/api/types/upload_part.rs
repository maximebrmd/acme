pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct UploadPart {
    #[serde(rename = "byteSize")]
    #[serde(default)]
    pub byte_size: i64,
    #[serde(rename = "partNumber")]
    #[serde(default)]
    pub part_number: i64,
    pub request: SignedRequest,
}

impl UploadPart {
    pub fn builder() -> UploadPartBuilder {
        <UploadPartBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UploadPartBuilder {
    byte_size: Option<i64>,
    part_number: Option<i64>,
    request: Option<SignedRequest>,
}

impl UploadPartBuilder {
    pub fn byte_size(mut self, value: i64) -> Self {
        self.byte_size = Some(value);
        self
    }

    pub fn part_number(mut self, value: i64) -> Self {
        self.part_number = Some(value);
        self
    }

    pub fn request(mut self, value: SignedRequest) -> Self {
        self.request = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`UploadPart`].
    /// This method will fail if any of the following fields are not set:
    /// - [`byte_size`](UploadPartBuilder::byte_size)
    /// - [`part_number`](UploadPartBuilder::part_number)
    /// - [`request`](UploadPartBuilder::request)
    pub fn build(self) -> Result<UploadPart, BuildError> {
        Ok(UploadPart {
            byte_size: self
                .byte_size
                .ok_or_else(|| BuildError::missing_field("byte_size"))?,
            part_number: self
                .part_number
                .ok_or_else(|| BuildError::missing_field("part_number"))?,
            request: self
                .request
                .ok_or_else(|| BuildError::missing_field("request"))?,
        })
    }
}
