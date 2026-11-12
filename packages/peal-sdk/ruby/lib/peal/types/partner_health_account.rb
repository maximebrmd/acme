# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class PartnerHealthAccount < Internal::Types::Model
      field :over_plan, -> { Internal::Types::Boolean }, optional: false, nullable: true, api_name: "overPlan"
    end
  end
end
