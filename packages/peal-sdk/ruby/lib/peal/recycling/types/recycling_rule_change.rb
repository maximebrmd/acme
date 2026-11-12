# frozen_string_literal: true

module Peal
  module Recycling
    module Types
      class RecyclingRuleChange < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"

        field :count, -> { Integer }, optional: true, nullable: true

        field :paused, -> { Internal::Types::Boolean }, optional: true, nullable: false

        field :until_, -> { String }, optional: true, nullable: true, api_name: "until"

        field :variants, -> { Internal::Types::Array[Peal::Types::RecyclingVariant] }, optional: true, nullable: false
      end
    end
  end
end
