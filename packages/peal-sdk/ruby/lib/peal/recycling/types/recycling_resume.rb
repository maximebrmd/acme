# frozen_string_literal: true

module Peal
  module Recycling
    module Types
      class RecyclingResume < Internal::Types::Model
        field :workspace_id, -> { String }, optional: false, nullable: false, api_name: "workspaceId"

        field :rule_id, -> { String }, optional: false, nullable: false, api_name: "ruleId"

        field :variants, -> { Internal::Types::Array[Peal::Types::RecyclingVariant] }, optional: true, nullable: false
      end
    end
  end
end
