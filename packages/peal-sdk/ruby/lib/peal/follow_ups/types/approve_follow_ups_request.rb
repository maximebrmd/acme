# frozen_string_literal: true

module Peal
  module FollowUps
    module Types
      class ApproveFollowUpsRequest < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"
      end
    end
  end
end
