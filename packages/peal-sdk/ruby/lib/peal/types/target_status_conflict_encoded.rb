# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class TargetStatusConflictEncoded < Internal::Types::Model
      field :status, -> { Peal::Types::PostTargetStatus }, optional: false, nullable: false
    end
  end
end
