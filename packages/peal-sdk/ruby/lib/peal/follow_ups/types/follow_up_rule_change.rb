# frozen_string_literal: true

module Peal
  module FollowUps
    module Types
      class FollowUpRuleChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"

        field :comment, -> { String }, optional: true, nullable: true

        field :likes, -> { Integer }, optional: true, nullable: false

        field :paused, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :repost, -> { Internal::Types::Boolean }, optional: true, nullable: false
      end
    end
  end
end
