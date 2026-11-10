pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FieldDescription {
    #[serde(rename = "forbiddenCharacters")]
    #[serde(default)]
    pub forbidden_characters: Vec<String>,
    #[serde(rename = "ifLeftOut")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub if_left_out: Option<FieldDefault>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lookup: Option<LookupName>,
    #[serde(rename = "maxLength")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_length: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maximum: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimum: Option<i64>,
    #[serde(default)]
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    #[serde(default)]
    pub required: bool,
    pub r#type: FieldType,
    #[serde(default)]
    pub values: Vec<String>,
}

impl FieldDescription {
    pub fn builder() -> FieldDescriptionBuilder {
        <FieldDescriptionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FieldDescriptionBuilder {
    forbidden_characters: Option<Vec<String>>,
    if_left_out: Option<FieldDefault>,
    lookup: Option<LookupName>,
    max_length: Option<i64>,
    maximum: Option<i64>,
    minimum: Option<i64>,
    name: Option<String>,
    pattern: Option<String>,
    required: Option<bool>,
    r#type: Option<FieldType>,
    values: Option<Vec<String>>,
}

impl FieldDescriptionBuilder {
    pub fn forbidden_characters(mut self, value: Vec<String>) -> Self {
        self.forbidden_characters = Some(value);
        self
    }

    pub fn if_left_out(mut self, value: FieldDefault) -> Self {
        self.if_left_out = Some(value);
        self
    }

    pub fn lookup(mut self, value: LookupName) -> Self {
        self.lookup = Some(value);
        self
    }

    pub fn max_length(mut self, value: i64) -> Self {
        self.max_length = Some(value);
        self
    }

    pub fn maximum(mut self, value: i64) -> Self {
        self.maximum = Some(value);
        self
    }

    pub fn minimum(mut self, value: i64) -> Self {
        self.minimum = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn pattern(mut self, value: impl Into<String>) -> Self {
        self.pattern = Some(value.into());
        self
    }

    pub fn required(mut self, value: bool) -> Self {
        self.required = Some(value);
        self
    }

    pub fn r#type(mut self, value: FieldType) -> Self {
        self.r#type = Some(value);
        self
    }

    pub fn values(mut self, value: Vec<String>) -> Self {
        self.values = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FieldDescription`].
    /// This method will fail if any of the following fields are not set:
    /// - [`forbidden_characters`](FieldDescriptionBuilder::forbidden_characters)
    /// - [`name`](FieldDescriptionBuilder::name)
    /// - [`required`](FieldDescriptionBuilder::required)
    /// - [`r#type`](FieldDescriptionBuilder::r#type)
    /// - [`values`](FieldDescriptionBuilder::values)
    pub fn build(self) -> Result<FieldDescription, BuildError> {
        Ok(FieldDescription {
            forbidden_characters: self
                .forbidden_characters
                .ok_or_else(|| BuildError::missing_field("forbidden_characters"))?,
            if_left_out: self.if_left_out,
            lookup: self.lookup,
            max_length: self.max_length,
            maximum: self.maximum,
            minimum: self.minimum,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            pattern: self.pattern,
            required: self
                .required
                .ok_or_else(|| BuildError::missing_field("required"))?,
            r#type: self
                .r#type
                .ok_or_else(|| BuildError::missing_field("r#type"))?,
            values: self
                .values
                .ok_or_else(|| BuildError::missing_field("values"))?,
        })
    }
}
