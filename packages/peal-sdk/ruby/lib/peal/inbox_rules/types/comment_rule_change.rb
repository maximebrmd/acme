# frozen_string_literal: true

module Peal
  module InboxRules
    module Types
      class CommentRuleChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"

        field :keywords, -> { Internal::Types::Array[String] }, optional: true, nullable: false

        field :paused, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :reply, -> { String }, optional: true, nullable: false
      end
    end
  end
end
