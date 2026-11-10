# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ApprovalOutcome < Internal::Types::Model
      field :approval, -> { Peal::Types::ApprovalRequest }, optional: false, nullable: false

      field :late, -> { Internal::Types::Boolean }, optional: false, nullable: false
    end
  end
end
