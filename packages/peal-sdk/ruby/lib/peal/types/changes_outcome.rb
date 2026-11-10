# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ChangesOutcome < Internal::Types::Model
      field :approval, -> { Peal::Types::ApprovalRequest }, optional: false, nullable: false

      field :comment, -> { Peal::Types::ReviewComment }, optional: false, nullable: false
    end
  end
end
