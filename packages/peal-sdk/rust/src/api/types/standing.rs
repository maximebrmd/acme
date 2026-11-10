pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Standing {
    #[serde(rename = "mustReduce")]
    #[serde(default)]
    pub must_reduce: bool,
    #[serde(default)]
    pub over: Vec<Excess>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(rename = "planWithRoom")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_with_room: Option<PaidPlan>,
    #[serde(rename = "scheduledPosts")]
    #[serde(default)]
    pub scheduled_posts: i64,
}

impl Standing {
    pub fn builder() -> StandingBuilder {
        <StandingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct StandingBuilder {
    must_reduce: Option<bool>,
    over: Option<Vec<Excess>>,
    plan: Option<Plan>,
    plan_with_room: Option<PaidPlan>,
    scheduled_posts: Option<i64>,
}

impl StandingBuilder {
    pub fn must_reduce(mut self, value: bool) -> Self {
        self.must_reduce = Some(value);
        self
    }

    pub fn over(mut self, value: Vec<Excess>) -> Self {
        self.over = Some(value);
        self
    }

    pub fn plan(mut self, value: Plan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn plan_with_room(mut self, value: PaidPlan) -> Self {
        self.plan_with_room = Some(value);
        self
    }

    pub fn scheduled_posts(mut self, value: i64) -> Self {
        self.scheduled_posts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Standing`].
    /// This method will fail if any of the following fields are not set:
    /// - [`must_reduce`](StandingBuilder::must_reduce)
    /// - [`over`](StandingBuilder::over)
    /// - [`scheduled_posts`](StandingBuilder::scheduled_posts)
    pub fn build(self) -> Result<Standing, BuildError> {
        Ok(Standing {
            must_reduce: self
                .must_reduce
                .ok_or_else(|| BuildError::missing_field("must_reduce"))?,
            over: self.over.ok_or_else(|| BuildError::missing_field("over"))?,
            plan: self.plan,
            plan_with_room: self.plan_with_room,
            scheduled_posts: self
                .scheduled_posts
                .ok_or_else(|| BuildError::missing_field("scheduled_posts"))?,
        })
    }
}
