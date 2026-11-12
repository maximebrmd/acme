pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingRuleVariantsItem {
    #[serde(default)]
    pub overrides: Vec<TextOverride>,
    #[serde(default)]
    pub text: String,
}

impl RecyclingRuleVariantsItem {
    pub fn builder() -> RecyclingRuleVariantsItemBuilder {
        <RecyclingRuleVariantsItemBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingRuleVariantsItemBuilder {
    overrides: Option<Vec<TextOverride>>,
    text: Option<String>,
}

impl RecyclingRuleVariantsItemBuilder {
    pub fn overrides(mut self, value: Vec<TextOverride>) -> Self {
        self.overrides = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`RecyclingRuleVariantsItem`].
    /// This method will fail if any of the following fields are not set:
    /// - [`overrides`](RecyclingRuleVariantsItemBuilder::overrides)
    /// - [`text`](RecyclingRuleVariantsItemBuilder::text)
    pub fn build(self) -> Result<RecyclingRuleVariantsItem, BuildError> {
        Ok(RecyclingRuleVariantsItem {
            overrides: self
                .overrides
                .ok_or_else(|| BuildError::missing_field("overrides"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
